import { DebugProtocol } from "vscode-debugprotocol";
import { EventEmitter } from "events";
import * as ChildProcess from "child_process";
import { DebugSession, TerminatedEvent } from "vscode-debugadapter";
import { GDBServer } from "./backend/gdb";
import { GDBServerController, ConfigurationArgs } from "./controller/gdb";
import { OpenOCDServerController } from "./controller/openocd";

export interface OpenOCDArgments {
	cwd: string;
	executable: string;
	searchDir: string;
	configFiles: string[];
}

export class ESPDebugSession extends DebugSession {
	private server: GDBServer;
	private args: ConfigurationArgs;
	private port: number;

	private controller: GDBServerController;

	protected quit: boolean;
	protected started: boolean;
	protected debugReady: boolean;
	protected stopped: boolean;

	public constructor() {
		super();

		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);
	}

	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		response.body.supportsRestartRequest = true;

		this.sendResponse(response);
	}

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: ConfigurationArgs): void {
		this.args = args;
		this.controller = new OpenOCDServerController(this.port);
		// this.controller.on('event', this.controllerEvent.bind(this));

		const serverExecutable = "executable path";
		const serverArgs = [];
		const initMatchRegex = /a*/g;

		this.quit = false;
		this.started = false;
		this.debugReady = false;
		this.stopped = false;

		this.server = new GDBServer(serverExecutable, serverArgs, initMatchRegex);
		this.server.on('quit', this.onQuit.bind(this));
		this.server.on('launcherror', this.onLaunchError.bind(this));

	}

	protected onQuit(response) {
		if (this.started) {
			this.started = false;
			this.sendEvent(new TerminatedEvent(false));
		}
		else {
			this.sendErrorResponse(
				response,
				103,
				`${this.controller.name} GDB Server quit unexpectedly.`
			);
		}
	}

	protected onLaunchError(err: number, response) {
		this.sendErrorResponse(response, 103, `Fail to launch ${this.controller.name} GDB Server: ${err.toString()}`);
	}
}