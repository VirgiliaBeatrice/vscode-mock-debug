// import { Event } from "vscode-debugadapter";
import { DebugProtocol } from "vscode-debugprotocol";
import { EventEmitter } from "events";

export interface ConfigurationArgs extends DebugProtocol.LaunchRequestArguments {
	serverArgs: string[];
}

export interface GDBServerController extends EventEmitter {
	port: number;
	name: string;

	setPort(port: number): void;
	setArgs(args: ConfigurationArgs): void;

	initCmds(): string[];
	launchCmds(): string[];
	// attachCmds(): string[];
	restartCmds(): string[];
	serverExecutable(): string;
	serverArgs(): string[];

	serverLaunchStarted(): void;
	serverLaunchCompleted(): void;
	debuggerLaunchStarted(): void;
	debuggerLaunchCompleted(): void;
}