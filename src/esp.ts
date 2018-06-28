import { DebugProtocol } from "vscode-debugprotocol";
import { EventEmitter } from "events";
import * as ChildProcess from "child_process";

export interface OpenOCDArgments {
	cwd: string;
	executable: string;
	searchDir: string;
	configFiles: string[];
}

export class OpenOCDServer extends EventEmitter {
	public name: string = "OpenOCD-ESP";
	public ports: { [name: string]: number };
	public args: OpenOCDArgments;

	private process: ChildProcess.ChildProcess;
	private outBuffer: string = '';
	private errBuffer: string = '';

	public setPorts(ports: { [name: string]: number }): void {
		this.ports = ports;
	}

	public setArgs(args: OpenOCDArgments): void {
		this.args = args;
	}

	private get initCmds(): string {
		const cmds = [
			this.args.cwd,
			this.args.executable
		];

		return cmds.join("");
	}

	private get initArgs(): string[] {
		const args = [
			"-s",
			this.args.searchDir,
		];

		this.args.configFiles.forEach(element => {
			args.push("-f", element);
		});

		return args;
	}

	private get initOptions(): object {
		const options = {
			cwd: this.args.cwd,
		};

		return options;
	}

	public init(): Thenable<any> {
		return new Promise((resolve, reject) => {
			this.process = ChildProcess.spawn(this.initCmds, this.initArgs, this.initOptions);
			this.process.stdout.on("data", this.onStdout.bind(this));
		})
	}

	private onStdout(chunk: string | Buffer): void {

	}
}