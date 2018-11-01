export interface MIInfo {
    token: number;
    outOfBandRecord: Array<{ isStream: boolean, type: string, asyncClass: string, output: Array<[string, any]>, content: string }>;
    resultRecords: { resultClass: string, results: Array<[string, any]> };
}

interface IRegExpHelper
{
    or: any;
    add: any;
}

let RegExpHelper: IRegExpHelper = {
    or: undefined,
    add: undefined
};

RegExpHelper.or = (beggining: boolean, end: boolean, ...regExps: RegExp[]): RegExp =>
{
    return new RegExp(
        [
            beggining ? "^" : "",
            regExps.map(
                (regExp) =>
                {
                    return `(${regExp.source})`;
                }
            ).join("|"),
            end ? "$" : ""
        ].join("")
    );
};

RegExpHelper.add = (beggining: boolean, end: boolean, ...regExps: RegExp[]): RegExp =>
{
    return new RegExp(
        [
            beggining ? "^" : "",
            regExps.map(
                (regExp) =>
                {
                    return `${regExp.source}`;
                }
            ).join(""),
            end ? "$" : ""
        ].join("")
    );
};

const octalMatch = /^[0-7]{3}/;
function parseString(str: string): string {
    const ret = new Buffer(str.length * 4);
    let bufIndex = 0;

    if (str[0] !== '"' || str[str.length - 1] !== '"') {
        throw new Error('Not a valid string');
    }
    str = str.slice(1, -1);
    let escaped = false;
    for (let i = 0; i < str.length; i++) {
        if (escaped) {
            let m;
            if (str[i] === '\\') {
                bufIndex += ret.write('\\', bufIndex);
            }
            else if (str[i] === '"') {
                bufIndex += ret.write('"', bufIndex);
            }
            else if (str[i] === '\'') {
                bufIndex += ret.write('\'', bufIndex);
            }
            else if (str[i] === 'n') {
                bufIndex += ret.write('\n', bufIndex);
            }
            else if (str[i] === 'r') {
                bufIndex += ret.write('\r', bufIndex);
            }
            else if (str[i] === 't') {
                bufIndex += ret.write('\t', bufIndex);
            }
            else if (str[i] === 'b') {
                bufIndex += ret.write('\b', bufIndex);
            }
            else if (str[i] === 'f') {
                bufIndex += ret.write('\f', bufIndex);
            }
            else if (str[i] === 'v') {
                bufIndex += ret.write('\v', bufIndex);
            }
            else if (str[i] === '0') {
                bufIndex += ret.write('\0', bufIndex);
            }
            else if (m = octalMatch.exec(str.substr(i))) {
                ret.writeUInt8(parseInt(m[0], 8), bufIndex++);
                i += 2;
            }
            else {
                bufIndex += ret.write(str[i], bufIndex);
            }
            escaped = false;
        } else {
            if (str[i] === '\\') {
                escaped = true;
            }
            else if (str[i] === '"') {
                throw new Error('Not a valid string');
            }
            else {
                bufIndex += ret.write(str[i], bufIndex);
            }
        }
    }
    return ret.slice(0, bufIndex).toString('utf8');
}

export class MINode implements MIInfo {
    public token: number;
    public outOfBandRecord: Array<{ isStream: boolean, type: string, asyncClass: string, output: Array<[string, any]>, content: string }>;
    public resultRecords: { resultClass: string, results: Array<[string, any]> };

    public static valueOf(start: any, path: string): any {
        if (!start) {
            return undefined;
        }
        const pathRegex = /^\.?([a-zA-Z_\-][a-zA-Z0-9_\-]*)/;
        const indexRegex = /^\[(\d+)\](?:$|\.)/;
        path = path.trim();
        if (!path) { return start; }
        let current = start;
        do {
            let target = pathRegex.exec(path);
            if (target) {
                path = path.substr(target[0].length);
                if (current.length && typeof current !== 'string') {
                    const found = [];
                    for (const element of current) {
                        if (element[0] === target[1]) {
                            found.push(element[1]);
                        }
                    }
                    if (found.length > 1) {
                        current = found;
                    }
                    else if (found.length === 1) {
                        current = found[0];
                    }
                    else {
                        return undefined;
                    }
                }
                else {
                    return undefined;
                }
            }
            else if (path[0] === '@') {
                current = [current];
                path = path.substr(1);
            }
            else {
                target = indexRegex.exec(path);
                if (target) {
                    path = path.substr(target[0].length);
                    const i = parseInt(target[1]);
                    if (current.length && typeof current !== 'string' && i >= 0 && i < current.length) {
                        current = current[i];
                    }
                    else if (i === 0) {
                    }
                    else {
                        return undefined;
                    }
                }
                else {
                    return undefined;
                }
            }
            path = path.trim();
        } while (path);
        return current;
    }

    constructor(
        token: number,
        info: Array<{ isStream: boolean, type: string, asyncClass: string, output: Array<[string, any]>, content: string }>,
        result: { resultClass: string, results: Array<[string, any]> }
    ) {
        this.token = token;
        this.outOfBandRecord = info;
        this.resultRecords = result;
    }

    public record(path: string): any {
        if (!this.outOfBandRecord) {
            return undefined;
        }
        return MINode.valueOf(this.outOfBandRecord[0].output, path);
    }

    public result(path: string): any {
        if (!this.resultRecords) {
            return undefined;
        }
        return MINode.valueOf(this.resultRecords.results, path);
    }
}

const tokenRegex = /^\d+/;
const outOfBandRecordRegex = /^(?:(\d*|undefined)([\*\+\=])|([\~\@\&]))/;
const resultRecordRegex = /^(\d*)\^(done|running|connected|error|exit)/;
const newlineRegex = /^\r\n?/;
const endRegex = /^\(gdb\)\r\n?/;
const variableRegex = /^([a-zA-Z_\-][a-zA-Z0-9_\-]*)/;
const asyncClassRegex = /^(.*?),/;

export function parseMI(output: string): MINode {
    /*
        output ==>
            (
                exec-async-output     = [ token ] "*" ("stopped" | others) ( "," variable "=" (const | tuple | list) )* \n
                status-async-output   = [ token ] "+" ("stopped" | others) ( "," variable "=" (const | tuple | list) )* \n
                notify-async-output   = [ token ] "=" ("stopped" | others) ( "," variable "=" (const | tuple | list) )* \n
                console-stream-output = "~" c-string \n
                target-stream-output  = "@" c-string \n
                log-stream-output     = "&" c-string \n
            )*
            [
                [ token ] "^" ("done" | "running" | "connected" | "error" | "exit") ( "," variable "=" (const | tuple | list) )* \n
            ]
            "(gdb)" \n
    */

    let token;
    const outOfBandRecord = [];
    let resultRecords;

    const asyncRecordType = {
        '*': 'exec',
        '+': 'status',
        '=': 'notify'
    };
    const streamRecordType = {
        '~': 'console',
        '@': 'target',
        '&': 'log'
    };

    const parseCString = (value) => {
        if (value[0] !== '"') {
            return '';
        }
        let stringEnd = 1;
        let inString = true;
        let remaining = value.substr(1);
        let escaped = false;
        while (inString) {
            if (escaped) {
                escaped = false;
            }
            else if (remaining[0] === '\\') {
                escaped = true;
            }
            else if (remaining[0] === '"') {
                inString = false;
            }

            remaining = remaining.substr(1);
            stringEnd++;
        }
        let str;
        try {
            str = parseString(value.substr(0, stringEnd));
        }
        catch (e) {
            str = value.substr(0, stringEnd);
        }
        value = value.substr(stringEnd);
        return str;
    };

    let parseValue;
    let parseCommaResult;
    let parseCommaValue;
    let parseResult;

    const parseTupleOrList = (value) => {
        if (value[0] !== '{' && value[0] !== '[') {
            return undefined;
        }
        const oldContent = value;
        const canBeValueList = value[0] === '[';
        value = value.substr(1);
        if (value[0] === '}' || value[0] === ']') {
            return [];
        }
        if (canBeValueList) {
            let value = parseValue();
            if (value) { // is value list
                const values = [];
                values.push(value);
                const remaining = value;
                while ((value = parseCommaValue()) !== undefined) {
                    values.push(value);
                }
                value = value.substr(1); // ]
                return values;
            }
        }
        let result = parseResult();
        if (result) {
            const results = [];
            results.push(result);
            while (result = parseCommaResult()) {
                results.push(result);
            }
            value = value.substr(1); // }
            return results;
        }
        value = (canBeValueList ? '[' : '{') + value;
        return undefined;
    };

    parseValue = (value) => {
        if (value[0] === '"') {
            return parseCString(value);
        }
        else if (value[0] === '{' || value[0] === '[') {
            return parseTupleOrList(value);
        }
        else {
            return undefined;
        }
    };


    parseCommaValue = (value) => {
        if (value[0] !== ',') {
            return undefined;
        }
        value = value.substr(1);
        return parseValue(value);
    };

    parseResult = (value) => {
        const variableMatch = variableRegex.exec(value);
        if (!variableMatch) {
            return undefined;
        }
        value = value.substr(variableMatch[0].length + 1);
        const variable = variableMatch[1];
        return [variable, parseValue(value)];
    };

    parseCommaResult = (value) => {
        if (value[0] !== ',') {
            return undefined;
        }
        value = value.substr(1);
        return parseResult(value);
    };

    const constRegExp = new RegExp(/"."/);
    const tupleRegExp = new RegExp(/\{.*\}/);
    const listRegExp = new RegExp(/\[.*\]/);

    const variableRegExp = new RegExp(/([a-zA-Z_\-][a-zA-Z0-9_\-]*)/);
    const valueRegExp: RegExp = RegExpHelper.or(constRegExp, tupleRegExp, listRegExp);

    const resultRegExp: RegExp = RegExpHelper.add(true, variableRegExp, new RegExp(/=/), valueRegExp);

    parseResult = (result: string) => {
        let variableMatch = variableRegExp.exec(result);
        let valueMatch = valueRegExp.exec(result);

        return [
            variableMatch[0],
        ];
    };

    let parseContent = (content: string) => {
        if (content[0] !== ',') {
            return undefined;
        }
        else {
            let subContent = content.substr(1);
            let resultMatch: RegExpMatchArray = resultRegExp.exec(subContent);

            // resultMatch[0]

        }
    };



    let match;

    let lines: string[] = (output as string).split(/\r\n?/);

    lines.forEach(
        (line) => {
            if (match = outOfBandRecordRegex.exec(line)) {
                if (match[1] && token === undefined && match[1] !== 'undefined')
                {
                    token = parseInt(match[1]);
                }

                if (match[2])
                {
                    const classMatch = asyncClassRegex.exec(line);
                    let value = line.substr(classMatch[1].length);
                    const asyncRecord = {
                        isStream: false,
                        type: asyncRecordType[match[2]],
                        asyncClass: classMatch[1],
                        output: []
                    };
                    let result;
                    while (result = parseCommaResult(value))
                    {
                        asyncRecord.output.push(result);
                    }
                    outOfBandRecord.push(asyncRecord);
                }
                else if (match[3])
                {
                    const streamRecord = {
                        isStream: true,
                        type: streamRecordType[match[3]],
                        content: parseCString(line)
                    };
                    outOfBandRecord.push(streamRecord);
                }
            }


            if (match = resultRecordRegex.exec(line))
            {
                let value = line.substr(match[0].length);
                if (match[1] && token === undefined)
                {
                    token = parseInt(match[1]);
                }
                resultRecords = {
                    resultClass: match[2],
                    results: []
                };
                let result;
                while (result = parseCommaResult(value))
                {
                    resultRecords.results.push(result);
                }
            }
        }
    );

    // while (match = outOfBandRecordRegex.exec(output)) {
    //     output = output.substr(match[0].length);
    //     if (match[1] && token === undefined && match[1] !== 'undefined') {
    //         token = parseInt(match[1]);
    //     }

    //     if (match[2]) {
    //         const classMatch = asyncClassRegex.exec(output);
    //         output = output.substr(classMatch[1].length);
    //         const asyncRecord = {
    //             isStream: false,
    //             type: asyncRecordType[match[2]],
    //             asyncClass: classMatch[1],
    //             output: []
    //         };
    //         let result;
    //         while (result = parseCommaResult()) {
    //             asyncRecord.output.push(result);
    //         }
    //         outOfBandRecord.push(asyncRecord);
    //     }
    //     else if (match[3]) {
    //         const streamRecord = {
    //             isStream: true,
    //             type: streamRecordType[match[3]],
    //             content: parseCString()
    //         };
    //         outOfBandRecord.push(streamRecord);
    //     }

    //     output = output.replace(newlineRegex, '');
    // }

    // if (match = resultRecordRegex.exec(output)) {
    //     output = output.substr(match[0].length);
    //     if (match[1] && token === undefined) {
    //         token = parseInt(match[1]);
    //     }
    //     resultRecords = {
    //         resultClass: match[2],
    //         results: []
    //     };
    //     let result;
    //     while (result = parseCommaResult()) {
    //         resultRecords.results.push(result);
    //     }

    //     output = output.replace(newlineRegex, '');
    // }

    return new MINode(token, outOfBandRecord as any || [], resultRecords);
}
