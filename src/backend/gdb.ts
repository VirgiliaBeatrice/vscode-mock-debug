import * as ChildProcess from 'child_process';
import { EventEmitter } from 'events';

export class GDBServer extends EventEmitter {
	private process: ChildProcess.ChildProcess;
	private outBuffer: string = '';
	private errBuffer: string  = '';
	private initResolve: (result: boolean) => void;
	private initReject: (error: any) => void;

	constructor(private application: string, private args: string[]) {
		super();
	}

	public init(): Thenable<any> {
		return new Promise((resolve, reject) => {
			if (this.application !== null) {
				this.initResolve = resolve;
				this.initReject = reject;

				this.process = ChildProcess.spawn(this.application, this.args, {});
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
			this.emit('output', this.outBuffer.substring(0, end));
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
            this.emit('output', this.errBuffer.substring(0, end));
            this.errBuffer = this.errBuffer.substring(end + 1);
        }
	}
}