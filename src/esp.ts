import { DebugProtocol } from "vscode-debugprotocol";
// import { EventEmitter } from "events";
// import * as ChildProcess from "child_process";
import { DebugSession, TerminatedEvent, InitializedEvent, Event } from "vscode-debugadapter";
import { GDBServer } from "./backend/gdb";
import { GDBServerController, ConfigurationArgs } from "./controller/gdb";
import { OpenOCDServerController } from "./controller/openocd";

export interface OpenOCDArgments {
	cwd: string;
	executable: string;
	searchDir: string;
	configFiles: string[];
}

export class AdapterOutputEvent extends Event {
	public body: {
		type: string,
		content: string
	}
	public event: string;

	constructor(content: string, type: string) {
		super('adapter-output', { content: content, type: type });
	}
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

		console.log("Start a debug session.");
	}

	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		response.body.supportsRestartRequest = true;

		this.sendResponse(response);
		console.log("Send an initial information.");

		this.sendEvent(new InitializedEvent());
		console.log("Send an initialized event.");
	}

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: ConfigurationArgs): void {
		this.args = args;
		this.controller = new OpenOCDServerController(this.port);
		// this.controller.on('event', this.controllerEvent.bind(this));

		// const serverExecutable = "C:\\msys32\\mingw32\\bin\\openocd.exe";
		const serverExecutable = "C:\\msys32\\usr\\bin\\bash.exe";
		const serverArgs = ["-l"];
		// const initMatchRegex = /a*/g;

		this.quit = false;
		this.started = false;
		this.debugReady = false;
		this.stopped = false;

		// TODO: Run server.
		this.server = new GDBServer(serverExecutable, serverArgs);
		this.server.on('output', (output) => {this.sendEvent(new AdapterOutputEvent(output, 'out'))});
		this.server.on('quit', this.onQuit.bind(this));
		this.server.on('launcherror', this.onLaunchError.bind(this));

		this.server.init().then(() => {
			console.info("OpenOCD server started.");
		});

		// this.controller.serverLaunchStarted();
		// this.server.init().then(() => {
		// 	this.controller.serverLaunchCompleted();

		// 	let gdbArgs = ['-q'];
		// 	gdbArgs = gdbArgs.concat(this.args.serverArgs || []);
		// });

		// Lauch Request
		// 1. Run controller
		// 2. Run server
		// 3. Register events

		console.log("Get a launch request.");

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

DebugSession.run(ESPDebugSession);
console.info("Just show something.");