import { BackendService, IBackendService, ServiceType } from "./service";
import { MINode, parseMI } from "./mi_parse";
import { DebugProtocol } from "vscode-debugprotocol";
import * as vscode from "vscode";
import { instanceOfMIResult, instanceOfMIAsyncRecord, instanceOfMIStream } from "./mi";

interface Task {
	token: number;
	cmd: string;
	onFinished: Function;
}

export enum DebuggerEvents {
	ExecStopped = "1",

}

export class GDBDebugger extends BackendService implements IBackendService
{
	public pendingTasks: Map<number, (string) => void> = new Map();
	public incToken: number = 0;
	public isInitialized: boolean = false;
	public isRunning: boolean = false;

	private _taskQ: Array<Task> = [];
	private _pendingTask: any = { onReceived: undefined };
	private _waiters: Map<string, () => void> = new Map();

	private _breakpoints: Map<string, DebugProtocol.SourceBreakpoint[]> = new Map();

	constructor(application: string, public root?: string, public cwd?: string, public path?: string[])
	{
		super("Subprocess for GDB Debugger Instance", ServiceType.Debugger, application, ["-q", "--interpreter=mi2", "-s", "C:\\msys64\\home\\Haoyan.Li\\esp\\hello_world\\build\\hello-world.elf"]);

		if (this.root === undefined)
		{
			this.root = "C:\\msys64";
		}

		if (this.path === undefined)
		{
			this.path = [
				"mingw32\\bin",
				"usr\\local\\bin",
				"usr\\bin",
				"bin",
				"opt\\xtensa-esp32-elf\\bin"
			];
		}

		this.setOptions({
			cwd: ".",
			env: BackendService.parseEnv(this.root, this.path)
		});

		this._taskQ = [];
	}

	public enqueueTask(cmd: string): Promise<any> {

		// wait for completing
		return new Promise(
			(resolve, reject) => {
				let notify = (result) => {
					resolve(result);
				};

				this.incToken ++;
				let task = {
					token: this.incToken,
					cmd: cmd,
					onFinished: notify
				};
				this._taskQ.push(task);

			}
		);
	}

	private _id;
	public run(): void {
		this._id = setTimeout(
			this.dispatchTask.bind(this), 10
		);
	}

	// public stop(): void {
	// 	clearInterval(this._id);
	// }

	public async dispatchTask(): Promise<any> {
		if (this._taskQ.length > 0) {
			if (!this.isRunning) {
				let task = this._taskQ.shift();
				let result = await this.sendRaw(task);

				// notify to original request
				task.onFinished(result);
				console.info(`Task ${task.token} finished.`);
				console.info(`Result: ${JSON.stringify(result)}`);
			}

		}

		this.run();
		// else {
		// 	return Promise.resolve();
		// }
	}

	public sendRaw(task: any): Promise<any> {

		return new Promise(
			(resolve, reject) => {
				let notify = (result) => {
					resolve(result);
				};

				this._pendingTask.onReceived = notify;
				this.process.stdin.write(task.token.toString() + "-" + task.cmd + "\n");
				console.log(`Send Command No.${task.token} "${task.cmd}"`);

			}
		);
	}

	public sendCommand(cmd: string): Promise<any> {
		this.incToken ++;
		this.process.stdin.write(this.incToken.toString() + "-" + cmd + "\n");
		console.log(`Send Command No.${this.incToken} "${cmd}"`);

		return new Promise(
			(resolve, reject) => {
				let callback = (record: string) =>
				{
					if (record)
					{
						resolve(record);
						// console.log(result);
					}
					else {
						reject();
					}
				};

				this.pendingTasks.set(this.incToken, callback);
			}
		);
	}

	public async executeCommand(cmd: string): Promise<any> {
		let record = await this.sendCommand(cmd);

		this.pendingTasks.delete(record.token);
		console.log(`Command No.${record.token} "${cmd}" finished.`);
		console.log(`Command No.${record.token} result: ${JSON.stringify(record)}.`);

		return record;
	}

	public async executeCommands(cmds: string[]): Promise<void> {
		cmds.forEach(
			async (cmd) => {
				await this.executeCommand(cmd);
			}
		);
	}

	public waitForNotify(waiter: string) {
		return new Promise(
			(resolve) => {
				let callback = () =>
				{
					resolve();
				};

				this._waiters.set(waiter, callback);
			}
		);
	}

	public postProcess(content: string): Array<any>
	{
		// console.log(content);
		let records = parseMI(content);
		// console.log(records);

		records.forEach(
			(record) => {
				if (record.token) {
					this._pendingTask.onReceived(record);
					// this.pendingTasks.get(record.token)(record);
				}


				if (instanceOfMIResult(record))
				{
					switch (record.resultClass)
					{
						case "done":

						// this.emit()
					}

				}
				else if (instanceOfMIAsyncRecord(record))
				{
					switch (record.asyncClass)
					{
						case "stopped":
							if (this.isInitialized){
								this.emit(DebuggerEvents.ExecStopped, parseInt(record["thread-id"]));
							}
							this.isRunning = false;

							// if (this._waiters.has("Stop")) {
							// 	this._waiters.get("Stop")();
							// }
							break;
						case "running":
							this.isRunning = true;
							break;
					}
				}
				else if (instanceOfMIStream(record))
				{

				}
				else { }
			}
		);

		return records;
	// 	if (record.token) {
	// 		this.pendingTasks.get(record.token)(content);
	// 	}
	// 	return record;
	}

	public async setBreakpoint(path: string, bp: DebugProtocol.SourceBreakpoint): Promise<any>
	{
		if (this._breakpoints.has(path)) {
			this._breakpoints.get(path).push(bp);
		}
		else {
			this._breakpoints.set(path, [ bp ]);
		}

		let result = await this.executeCommand(`break-insert ${path}:${bp.line} `);

		return result;
	}

	public clearBreakpoints(path: string): void {
		let bps = this._breakpoints.get(path) || [];

		let deleteTasks = bps.map(
			(bp) => {
				this.clearBreakpoint(1);
			}
		);

		Promise.all(deleteTasks).then(
			() => {
				return false;
			}
		);

		// return new Promise(
		// 	async (resolve, reject) => {
		// 		let record = await this.executeCommand("break-delete");

		// 	}
		// );
	}

	public clearBreakpoint(number: number): Promise<any> {
		return new Promise(
			async (resolve, reject) => {
				let result = await this.executeCommand(`break-delete ${number}`);

				if (result.isDone) {
					resolve(result);
				}
				else {
					reject(false);
				}
			}
		);
	}

	public async getThreads(threadId?: number): Promise<any> {
		let result = await this.enqueueTask(`thread-info`);
		// let result = await this.executeCommand(`thread-info`);

		return result;
	}

	public async getBacktrace(threadId?: number): Promise<any> {
		await this.enqueueTask(`thread-select ${threadId}`);
		let result = await this.enqueueTask("stack-list-frames");

		return result;
	}

	public async getScope(frameId?: number): Promise<any> {
		await this.enqueueTask(`stack-select-frame ${frameId}`);
		// let result = await this.enqueueTask(`stack-list`)
	}

	public async getVariables(threadId: number, frameId: number): Promise<any> {
		let result = await this.enqueueTask(`stack-list-variables --thread ${threadId} --frame ${frameId} --simple-values`);

		return result;
	}
}

interface Breakpoint {
	number: number;
	addr: string;
	file: string;
	fullname: string;
	line: number;
	threadGroups: string[];
	times: number;
}