import * as ChildProcess from 'child_process';
import { EventEmitter } from 'events';
import * as Path from 'path';

export interface IBackendService extends EventEmitter {
	name: string;
	application: string;
	process: ChildProcess.ChildProcess;
	outBuffer: string;
	errBuffer: string;

	initResolve: (result: boolean) => void;
	initReject: (error: any) => void;

	init: () => Thenable<any>;
	exit: () => void;

	// serverEnv: (root: string, paths: string[]) => Object;
}

export class BackendService extends EventEmitter implements IBackendService  {
	public process: ChildProcess.ChildProcess;
	public outBuffer: string = '';
	public errBuffer: string  = '';
	public initResolve: (result: boolean) => void;
	public initReject: (error: any) => void;

	constructor(public name: string, public application: string, private args?: string[], private addtionalEnv?: any, private options?: ChildProcess.SpawnOptions) {
		super();

		if (this.options === undefined) {
			this.options = { };
		}

		if (this.addtionalEnv) {
			this.options = {
				cwd: this.addtionalEnv.root,
				env: this.serverEnv(this.addtionalEnv.root, this.addtionalEnv.relPaths)
			};

		}
	}

	public init(): Thenable<any> {
		return new Promise((resolve, reject) => {
			if (this.application !== null) {
				this.initResolve = resolve;
				this.initReject = reject;

				this.process = ChildProcess.spawn(this.application, this.args, this.options);
				this.process.stdout.on('data', this.onStdout.bind(this));
				this.process.stderr.on('data', this.onStderr.bind(this));

				this.process.on('exit', this.onExit.bind(this));
				this.process.on('error', this.onError.bind(this));
			}
		});
	}

	public exit(): void {
		if (this.process) {
			this.process.kill();
		}
	}

	private onExit(code, signal) {
		this.emit('exit', code, signal);
	}

	private onError(err) {
		if (this.initReject) {
			this.initReject(err);
			this.initReject = null;
			this.initResolve = null;
		}

		this.emit('launcherror', err);
	}

	private onStdout(data) {
		this.outBuffer += data;

		if (this.initResolve) {
			this.initResolve(true);
			this.initResolve = null;
			this.initReject = null;
		}

		const end = this.outBuffer.lastIndexOf('\n');
		if (end !== -1) {
			this.emit('output', this.outBuffer.substring(0, end), this.name);
			this.outBuffer = this.outBuffer.substring(end + 1);
		}
	}

	private onStderr(data) {
		this.errBuffer += data;

		if (this.initResolve) {
			this.initResolve(true);
			this.initResolve = null;
			this.initReject = null;
		}

		// Output a newline
        const end = this.errBuffer.lastIndexOf('\n');
        if (end !== -1) {
            this.emit('output', this.errBuffer.substring(0, end), this.name);
            this.errBuffer = this.errBuffer.substring(end + 1);
        }
	}

	protected serverEnv(root: string, relPaths: string[]): Object
	{
		let env = process.env;

		relPaths.forEach(path =>
		{
			env.Path += ";" + Path.normalize(Path.join(root, path));
		});

		return env;
	}
}

