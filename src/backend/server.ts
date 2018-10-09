import * as ChildProcess from 'child_process';
import { EventEmitter } from 'events';

export class GDBServer extends EventEmitter {
	private process: any;
	private outBuffer: string = '';
	private errBuffer: string  = '';
	private initResolve: (result: boolean) => void;
	private initReject: (error: any) => void;

	constructor(private application: string, private args: string[], private initMatch: RegExp) {
		super();
	}

	public init(): Thenable<any> {
		return new Promise((resolve, reject) => {
			if (this.application !== null) {
				this.initResolve = resolve;
				this.initReject = reject;

				this.process = ChildProcess.spawn(this.application, this.args, {});
				this.process.stdout.on('data', this.onStdout.bind(this));
			}
		});
	}

	private onStdout(data) {
		this.outBuffer += data;

		if (this.initResolve) {
			this.initResolve(true);
			this.initResolve = null;
			this.initReject = null;
		}
	}
}