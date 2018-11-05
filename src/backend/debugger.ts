import { BackendService, IBackendService, ServiceType } from "./service";
import { MINode, parseMI } from "./mi_parse";
import { DebugProtocol } from "vscode-debugprotocol";

interface Task {
	callback: Function;
}

export class GDBDebugger extends BackendService implements IBackendService
{
	public pendingTasks: Map<number, (string) => void> = new Map();
	public incToken: number = 0;

	constructor(application: string, public root?: string, public cwd?: string, public path?: string[])
	{
		super("Subprocess for GDB Debugger Instance", ServiceType.Debugger, application, ["-q", "--interpreter=mi2"]);

		if (this.root === undefined)
		{
			this.root = "C:\\msys32";
		}

		if (this.path === undefined)
		{
			this.path = [
				"mingw32\\bin",
				"usr\\local\\bin",
				"usr\\bin",
				"bin",
				"opt\\xtensa-esp32-elf\\bin"
			];
		}

		this.setOptions({
			cwd: ".",
			env: BackendService.parseEnv(this.root, this.path)
		});
	}

	public sendCommand(cmd: string): Promise<any> {
		this.incToken ++;
		this.process.stdin.write(this.incToken.toString() + "-" + cmd + "\n");

		return new Promise(
			(resolve, reject) => {
				let callback = (record: string) =>
				{
					if (record)
					{
						resolve(record);
						// console.log(result);
					}
					else {
						reject();
					}
				};

				this.pendingTasks.set(this.incToken, callback);
			}
		);
	}

	public async executeCommand(cmd: string): Promise<any> {
		let record = await this.sendCommand(cmd);

		this.pendingTasks.delete(record.token);
		console.log(`Command No.${record.token} "${cmd}" finished.`);

		return record;
	}

	public async executeCommands(cmds: string[]): Promise<void> {
		cmds.forEach(
			async (cmd) => {
				await this.executeCommand(cmd);
			}
		);
	}

	public postProcess(content: string): Array<any>
	{
		// console.log(content);
		let records = parseMI(content);
		// console.log(records);

		records.forEach(
			(record) => {
				if (record.token) {
					this.pendingTasks.get(record.token)(record);
				}
			}
		);

		return records;
	// 	if (record.token) {
	// 		this.pendingTasks.get(record.token)(content);
	// 	}
	// 	return record;
	}

	public clearBreakpoints(): Promise<boolean> {
		return new Promise(
			async (resolve, reject) => {
				let record = await this.executeCommand("break-delete");

			}
		);
	}
}