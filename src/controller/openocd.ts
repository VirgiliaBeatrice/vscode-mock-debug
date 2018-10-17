import { GDBServerController, ConfigurationArgs } from "./gdb";
import { EventEmitter } from "events";

export class OpenOCDServerController extends EventEmitter implements GDBServerController {
	// public port = 4444;
	public name = 'OpenOCD-ESP32';

	private args: ConfigurationArgs;

	constructor(public port: number) {
		super();
	}

	public setPort(port: number): void {
		this.port = port;
	}

	public setArgs(args: ConfigurationArgs): void {
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
