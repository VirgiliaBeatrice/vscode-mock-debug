import { DebugProtocol } from "vscode-debugprotocol";
// import { EventEmitter } from "events";
// import * as ChildProcess from "child_process";
import { DebugSession, TerminatedEvent, InitializedEvent, Event, Breakpoint, StoppedEvent, Thread, StackFrame, Scope, Variable, Source } from "vscode-debugadapter";
import { BackendService } from "./backend/service";
import { GDBServerController, LaunchConfigurationArgs } from "./controller/gdb";
import { OpenOCDDebugController } from "./controller/openocd";
import { GDBDebugger, DebuggerEvents } from "./backend/debugger";
import { GDBServer } from "./backend/server";
import { Subject } from "await-notify";
import { MIResultThread, MIResultBacktrace } from "./backend/mi";

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
    protected isDebugReady: boolean = false;
    protected stopped: boolean;

    private _debuggerReady: Subject = new Subject();
    private _initialized: Subject = new Subject();

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

    protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchConfigurationArgs): Promise<any> {
        console.log("Get a launch request.");

        this.args = args;
        // this.controller.on('event', this.controllerEvent.bind(this));

        const serverExecutable = "C:\\msys32\\mingw32\\bin\\openocd.exe";
        // const serverExecutable = "C:\\msys32\\usr\\bin\\bash.exe";
        const serverArgs = [];
        // const initMatchRegex = /a*/g;

        this.quit = false;
        this.started = false;
        this.isDebugReady = false;
        this.stopped = false;

        // TODO: Run controller.
        this.controller = new OpenOCDDebugController(4444);
        this.controller.setArgs(this.args);

        // TODO: Run server.
        this.server = new GDBServer(
            this.controller.serverApplication(),
            this.controller.serverArgs(),
            this.controller.serverRoot()
            // "."
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

        await this.server.start();
        console.info("OpenOCD server started.");

        // this.server.start().then(
        // 	() => {
        // 		console.info("OpenOCD server started.");
        // 	},
        // 	() => {
        // 		this.server.emit('lauhcherror', 103, response);
        // 	}
        // );

        // TODO: Run debugger
        // this.debugger = new BackendService(
        // 	"Subprocess for Debugger Instance",
        // 	this.controller.debuggerApplication(),
        // 	this.controller.debuggerArgs()
        // );
        this.debugger = new GDBDebugger(
            this.controller.debuggerApplication(),
            this.controller.debuggerArgs(),
            this.controller.debuggerRoot()
        );
        this.debugger.on('output', (output, source) => {this.sendEvent(new AdapterOutputEvent(output, 'out', source));});

        this.debugger.on(DebuggerEvents.ExecStopped, (threadId) =>
        {
            let e: DebugProtocol.StoppedEvent = new StoppedEvent('stop', threadId);
            e.body.allThreadsStopped = true;

            this.sendEvent(e);
            console.log("Send a stop event.");
        });

        await this.debugger.start();
        console.info("GDB debugger started.");
        this.debugger.run();

        await this.debugger.enqueueTask("interpreter-exec console \"target remote localhost:3333\"");
        await this.debugger.enqueueTask("interpreter-exec console \"monitor reset halt\"");
        await this.debugger.enqueueTask("break-insert -t -h app_main");
        await this.debugger.enqueueTask("exec-continue");

        this._debuggerReady.notifyAll();
        this.debugger.isInitialized = true;

        // this.debugger.start().then(async () => {
        // 	console.info("GDB debugger started.");
        // 	this.debugger.run();


        // 	await this.debugger.enqueueTask("interpreter-exec console \"target remote localhost:3333\"");
        // 	// await Promise.all(
        // 	// 	[
        // 	// 		this.debugger.executeCommand("gdb-set target-async on"),
        // 	// 		this.debugger.executeCommand("interpreter-exec console \"target remote localhost:3333\""),
        // 	// 		this.debugger.executeCommand("interpreter-exec console \"monitor reset halt\""),
        // 	// 		this.debugger.executeCommand("break-insert -t -h app_main")
        // 	// 	]
        // 	// );
        // 	this._debuggerReady.notifyAll();
        // 	this.debugger.isInitialized = true;

        // 	// await this.debugger.executeCommand("exec-continue");

        // });


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

        this.sendResponse(response);

    }

    protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): Promise<any> {

        const path: string = args.source.path;
        const currentBreakpoints: DebugProtocol.SourceBreakpoint[] = args.breakpoints || [];

        if (!this.isDebugReady){
            await this._debuggerReady.wait(60000);
            this.isDebugReady = true;
        }

        // Clear all bps for this file.
        await this.debugger.clearBreakpoints(path);

        // Set and verify bp locations.
        const actualBreakpoints = currentBreakpoints.map(
            (bp) => {
                this.debugger.setBreakpoint(path, bp);

                let returnBp = new Breakpoint(true);
                return returnBp;
            }
        );

        response.body = {
            breakpoints: actualBreakpoints
        };



        this.sendResponse(response);
    }

    static CreateThreads(record: MIResultThread): Array<DebugProtocol.Thread> {
        return record.threads.map(
            (thread) =>
            {
                return new Thread(
                    parseInt(thread["id"]),
                    thread["target-id"]
                );
            }
        );
    }

    protected async threadsRequest(response: DebugProtocol.ThreadsResponse): Promise<void> {
        if (!this.isDebugReady)
        {
            await this._debuggerReady.wait(60000);
            this.isDebugReady = true;
        }
        let record: MIResultThread = await this.debugger.getThreads();

        response.body = {
            threads: ESPDebugSession.CreateThreads(record)
        };

        this.sendResponse(response);
    }

    static CreateSource(frame: any): Source {
        return new Source(
            frame["file"],
            frame["fullname"]
        );
    }

    static CreateStackFrames(record: MIResultBacktrace): Array<DebugProtocol.StackFrame> {
        return record.stack.map(
            (stack) => {
                let stackframe = new StackFrame(
                    parseInt(stack.frame["level"]),
                    stack.frame["func"]
                );

                if (stack.frame.hasOwnProperty("file"))
                {
                    stackframe.source = ESPDebugSession.CreateSource(stack.frame);
                    stackframe.line = parseInt(stack.frame["line"]);

                    return stackframe;
                }
                else {
                    return stackframe;
                }

                // return new StackFrame(
                // 	parseInt(frame["level"]),
                // 	frame["file"],
                // 	ESPDebugSession.CreateSource(frame),
                // 	parseInt(frame["line"])
                // );
            }
        );
    }

    public selectedThreadId: number = 0;
    public selectedFrameId: number = 0;

    protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): Promise<void> {
        let record: MIResultBacktrace = await this.debugger.getBacktrace(args.threadId);
        this.selectedThreadId = args.threadId;

        response.body = {
            stackFrames: ESPDebugSession.CreateStackFrames(record),
            totalFrames: 3
        };
        this.sendResponse(response);
    }

    protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void
    {
        this.selectedFrameId = args.frameId;

        response.body = {
            scopes: [
                new Scope("Global", 1, true),
                new Scope("Local", 2, false)
            ]
        };
        this.sendResponse(response);
    }

    static CreateVariables(record) {
        return record.variables.map(
            (variable) => {
                return new Variable(
                    variable.name,
                    variable.value
                );
            }
        );
    }

    protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): Promise<void>
    {
        let record = await this.debugger.getVariables(this.selectedThreadId, this.selectedFrameId);

        response.body = {
            variables: ESPDebugSession.CreateVariables(record)
        };

        this.sendResponse(response);
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