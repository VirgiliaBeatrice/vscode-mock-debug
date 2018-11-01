import { BackendService, IBackendService, ServiceType } from "./service";
import { MINode, parseMI } from "./mi_parse";

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
				let callback = (result: string) =>
				{
					if (result)
					{
						resolve(result);
						console.log(result);
					}
					else {
						reject();
					}
				};

				this.pendingTasks.set(this.incToken, callback);
			}
		);
	}

	public async excuteCommand(cmd: string): Promise<any> {
		let result = await this.sendCommand(cmd);

		this.pendingTasks.delete(result.token);
		console.log(`Command(${cmd}) finished.`);
	}

	public postProcess(content: string): MINode
	{
		console.log(content);
		let record = parseMI(content);
		console.log(record);

		if (record.token) {
			this.pendingTasks.get(record.token)(content);
		}
		return record;
	}
}