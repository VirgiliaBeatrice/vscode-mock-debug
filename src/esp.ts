import { DebugProtocol } from "vscode-debugprotocol";
// import { EventEmitter } from "events";
// import * as ChildProcess from "child_process";
import { DebugSession, TerminatedEvent, InitializedEvent, Event } from "vscode-debugadapter";
import { BackendService } from "./backend/service";
import { GDBServerController, LaunchConfigurationArgs } from "./controller/gdb";
import { OpenOCDDebugController } from "./controller/openocd";
import { GDBDebugger } from "./backend/debugger";
import { GDBServer } from "./backend/server";

export interface OpenOCDArgments {
	cwd: string;
	executable: string;
	searchDir: string;
	configFiles: string[];
}

export class AdapterOutputEvent extends Event {
	public body: {
		type: string,
		content: string,
		source: string
	};
	public event: string;

	constructor(content: string, type: string, source: string) {
		super('adapter-output', { content: content, type: type, source: source });
	}
}

export class ESPDebugSession extends DebugSession {
	private server: BackendService;
	private debugger: GDBDebugger;
	private args: LaunchConfigurationArgs;
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

	// Send capabilities
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		// response.body.supportsRestartRequest = true;
		response.body.supportsTerminateRequest = true;
		response.body.supportTerminateDebuggee = true;

		this.sendResponse(response);
		console.log("Send an initial information.");

		this.sendEvent(new InitializedEvent());
		console.log("Send an initialized event.");
	}

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchConfigurationArgs): void {
		this.args = args;
		// this.controller.on('event', this.controllerEvent.bind(this));

		const serverExecutable = "C:\\msys32\\mingw32\\bin\\openocd.exe";
		// const serverExecutable = "C:\\msys32\\usr\\bin\\bash.exe";
		const serverArgs = [];
		// const initMatchRegex = /a*/g;

		this.quit = false;
		this.started = false;
		this.debugReady = false;
		this.stopped = false;

		// TODO: Run controller.
		this.controller = new OpenOCDDebugController(4444);
		this.controller.setArgs(this.args);

		// TODO: Run server.
		this.server = new GDBServer(
			this.controller.serverApplication(),
			this.controller.serverArgs(),
			"C:\\msys32",
			"."
		);

		// this.server = new BackendService(
		// 	"Subprocess for Server Instance",
		// 	this.controller.serverApplication(),
		// 	this.controller.serverArgs(),
		// 	this.controller.additionalEnv()
		// );
		// this.server = new GDBServer(this.controller.serverApplication(), this.controller.serverArgs());
		this.server.on('output', (output, source) => {this.sendEvent(new AdapterOutputEvent(output, 'out', source));});
		this.server.on('quit', this.onQuit.bind(this));
		this.server.on('launcherror', this.onLaunchError.bind(this));
		this.server.on('exit', (code, signal) => {
			console.log(`Server process exited. CODE: ${code} SIGNAL:  ${signal}`);
		});

		this.server.init().then(
			() => {
				console.info("OpenOCD server started.");
			},
			() => {
				this.server.emit('lauhcherror', 103, response);
			}
		);

		// TODO: Run debugger
		// this.debugger = new BackendService(
		// 	"Subprocess for Debugger Instance",
		// 	this.controller.debuggerApplication(),
		// 	this.controller.debuggerArgs()
		// );
		this.debugger = new GDBDebugger(
			this.controller.debuggerApplication()
		);
		this.debugger.on('output', (output, source) => {this.sendEvent(new AdapterOutputEvent(output, 'out', source));});
		this.debugger.init().then(() => {
			console.info("GDB debugger started.");
			// this.debugger.executeCommands(this.controller.initCmds());
			this.debugger.executeCommand("interpreter-exec console \"target remote localhost:3333\"");
			this.debugger.executeCommand("file-exec-and-symbols .\\build\\hello-world.elf");
			this.debugger.executeCommand("interpreter-exec console \"monitor reset halt\"");
			this.debugger.executeCommand("break-insert -t -h app_main");
			// this.debugger.executeCommand("exec-continue");
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
		this.sendResponse(response);

	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {

		const path: string = args.source.path;
		const currentBreakpoints: DebugProtocol.SourceBreakpoint[] = args.breakpoints || [];

		// Clear all bps for this file.

		// Set and verify bp locations.
		const actualBreakpoints = currentBreakpoints.map(
			(bp) => {
				this.debugger.sendCommand("set bp");
			}
		);



	}

	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		this.onQuit(response);
	}

	protected terminateRequest(response: DebugProtocol.TerminateResponse, args: DebugProtocol.TerminateArguments): void {
		this.server.exit();
		this.debugger.exit();
		this.sendEvent(new TerminatedEvent(false));
		this.sendResponse(response);
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