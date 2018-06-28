import { LoggingDebugSession, DebugSession } from "vscode-debugadapter";
import { DebugProtocol } from "vscode-debugprotocol";


/* interface AttachRequestArgments extends DebugProtocol.AttachRequestArguments {
    cwd: string;
    target: string;
    gdbpath: string;
    openocd_port: number;
} */

interface LaunchRequestArgments extends DebugProtocol.LaunchRequestArguments {
    cwd: string;
    server: string;
}

class ESPDebugSession extends DebugSession {
    private args: LaunchRequestArgments;

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArgments): void {
        this.args = args;
    }
}

DebugSession.run(ESPDebugSession);