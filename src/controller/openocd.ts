import { GDBServerController, LaunchConfigurationArgs } from "./gdb";
import { EventEmitter } from "events";
import * as Path from "path";

export class OpenOCDDebugController extends EventEmitter implements GDBServerController {
	// public port = 4444;
	public name = 'OpenOCD-ESP32';

	private args: LaunchConfigurationArgs;

	constructor(public port: number) {
		super();
	}

	public setPort(port: number): void {
		this.port = port;
	}

	public setArgs(args: LaunchConfigurationArgs): void {
		this.args = args;
	}

	public run(): void {

	}

	public initCmds(): string[] {
		return [
			`target-select extended-remote localhost:${this.port.toString()}`
		];
	}

	public launchCmds(): string[] {
		return [
			'interpreter-exec console "monitor reset halt"',
			'enable-pretty-printing'
		];
	}

	public restartCmds(): string[] {
		return [
			'interpreter-exec console "monitor reset halt"'
		];
	}

	public serverApplication(): string {
		return Path.join(this.args.serverCwd, this.args.serverExecutable);
	}

	public serverExecutable(): string {
		return 'openocd.exe';
	}

	public serverArgs(): string[] {
		return this.args.serverArgs;
	}

	public serverLaunchStarted(): void {};
	public serverLaunchCompleted(): void {};
	public debuggerLaunchStarted(): void {};
	public debuggerLaunchCompleted(): void {};

}
