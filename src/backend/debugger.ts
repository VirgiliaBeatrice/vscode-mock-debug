import { BackendService, IBackendService, ServiceType } from "./service";

export class GDBDebugger extends BackendService implements IBackendService
{
	constructor(application: string, public root?: string, public cwd?: string, public path?: string[])
	{
		super("Subprocess for GDB Debugger Instance", ServiceType.Debugger, application);

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
}