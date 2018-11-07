export interface MIResult {
	token: number;
	resultClass: "done" | "running" | "connected" | "error" | "exit";
	result?: Array<any>;
	msg?: string;
	code?: string;
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

// function parseMITextToMIObject(miText: string): Object {
// 	return
// }