import { LoggingDebugSession, DebugSession, StoppedEvent, InitializedEvent } from "vscode-debugadapter";
import { DebugProtocol } from "vscode-debugprotocol";
import { OpenOCDServer } from "./esp";
import { GDBClient } from "./client";


/* interface AttachRequestArgments extends DebugProtocol.AttachRequestArguments {
    cwd: string;
    target: string;
    gdbpath: string;
    openocd_port: number;
} */

interface LaunchRequestArgments extends DebugProtocol.LaunchRequestArguments {
    cwd: string;
    serverExecutable: string;
    clientExecutable: string;
}

export class ESPDebugSession extends DebugSession {
    private args: LaunchRequestArgments;
    private gdbServer: OpenOCDServer;
    private gdbClient: GDBClient;
    private static THREAD_ID = 1;

    public constructor() {
        super();

        this.gdbServer = new OpenOCDServer();
        this.gdbClient = new GDBClient();

        // this.gdbServer.on("stopOnEntry", () => {
        //     this.sendEvent(new StoppedEvent("entry", ESPDebugSession.THREAD_ID));
        // });
        // this._gdbServer.on()
    }

    protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        response.body = response.body || {};

        this.sendResponse(response);

        this.sendEvent(new InitializedEvent());
    }

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArgments): void {
        this.args = args;

        this.gdbServer.init().then(() => {
            this.gdbClient.init();
        }).then();
    }
}

DebugSession.run(ESPDebugSession);