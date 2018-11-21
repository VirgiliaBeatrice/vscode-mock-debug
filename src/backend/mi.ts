export interface MIResult {
    token: number;
    resultClass: "done" | "running" | "connected" | "error" | "exit";
    result?: Array<any>;
    msg?: string;
    code?: string;
}

export interface MIStream {
    type: string;
    streamOutput: string;
}

export interface MIAsyncRecord {
    token: number | undefined;
    type: string;
    asyncClass: string | "stopped";
}

export interface MIAsyncOutput {
    asyncClass: string;

}

export interface MIResultDone {
    resultClass: "done";
    result?: Array<any>;
}

export interface MIResultRunning {
    resultClass: "running";
}

export interface MIResultConnected {
    resultClass: "connected";
}

export interface MIResultError {
    resultClass: "error";
    msg: string;
    code?: string;
}

export interface MIResultExit {
    resultClass: "exit";
}

export function instanceOfMIResult(object: any): object is MIResult {
    return "resultClass" in object;
}

export function instanceOfMIAsyncRecord(object: any): object is MIAsyncRecord {
    return "asyncClass" in object;
}

export function instanceOfMIStream(object: any): object is MIStream {
    return "streamOutput" in object;
}

export interface MIResultThread extends MIResult {
    threads: Array<any>;
    "current-thread-id"?: string;
}

export interface MIResultBacktrace extends MIResult {
    stack: Array<any>;
}

// function parseMITextToMIObject(miText: string): Object {
// 	return
// }