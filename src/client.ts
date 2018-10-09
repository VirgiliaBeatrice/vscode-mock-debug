import { EventEmitter } from "events";
import * as ChildProcess from "child_process";


interface GDBClientArgments {
	cwd: string;
	executable: string;
	sourceFile: string;
}

export class GDBClient extends EventEmitter {
	private process: ChildProcess.ChildProcess;
	private outBuffer: string = "";
	private inBuffer: string = "";
	private errBuffer: string = "";

	constructor(public args?: GDBClientArgments) {
		super();
	};

	// public init(): Thenable<any> {
	// 	return new Promise((resolve, reject) => {
	// 		this.process = ChildProcess.spawn(this._initCmds, this._initArgs);
	// 		this.process.stdout.on("data", this._onStdout.bind(this));
	// 		this.process.stderr.on("data", this._onStderr.bind(this));

	// 		resolve();
	// 	})
	// }

	public init(): Thenable<any> {
		this.process = ChildProcess.spawn(this._initCmds, this._initArgs);
		this.process.stdout.on("data", this._onStdout.bind(this));
		this.process.stderr.on("data", this._onStderr.bind(this));

		return new Promise((resolve, reject) => {
			resolve();
		})
	}

	private get _initCmds(): string {
		if (this.args !== undefined) {
			const cmds = [
				this.args.cwd,
				this.args.executable
			]
			return cmds.join("");
		}
		else {
			return ""
		}

	}

	private get _initArgs(): string[] {
		if (this.args) {
			return [ this.args.sourceFile ];
		}
		else {
			return [];
		}
	}

	private _onStdout(): void {

	}

	private _onStderr(): void {

	}
}