import os from 'node:os';
import { Worker } from 'node:worker_threads';

import { lastValueFrom, Subject } from 'rxjs';

export type RxWorkerMessage<T> =
	| {
			readonly type: 'init' | 'complete';
	  }
	| {
			readonly type: 'next';
			readonly value: T;
	  }
	| {
			readonly type: 'error';
			readonly error: unknown;
	  };

interface PendingTask<Task, Value> {
	readonly task: Task;
	readonly subject: Subject<Value>;
}

export class WorkerPool<Task, Value> {
	readonly uri: URL;

	private readonly pool: Worker[];
	private readonly workers: readonly Worker[];
	private readonly pendingTasks: PendingTask<Task, Value>[];

	constructor(uri: URL) {
		this.uri = uri;
		this.pool = Array.from({ length: os.cpus().length }).map(() => new Worker(uri));
		this.workers = Array.from(this.pool);
		this.pendingTasks = [];
	}

	private runNext(worker: Worker, pending = this.pendingTasks.shift()) {
		if (pending) {
			worker.once('message', ({ type }: RxWorkerMessage<Value>) => {
				if (type !== 'init') {
					throw new Error(`invalid message type: expected 'init', got '${type}'`);
				}

				this.observe(worker, pending);
			});

			worker.postMessage(undefined);
		}
	}

	private observe(worker: Worker, { task, subject }: PendingTask<Task, Value>) {
		const unsubscribe = () => {
			worker.off('error', handleError);
			worker.off('messageerror', handleError);
			worker.off('exit', handleExit);
			worker.off('message', handleMessage);
		};

		const handleError = (error: unknown) => {
			subject.error(error);
			unsubscribe();
		};

		const handleExit = (code: number) => {
			subject.error(new Error(`unexpected worker exit with code ${code}`));
		};

		const handleMessage = (message: RxWorkerMessage<Value>) => {
			if (message.type === 'error') {
				subject.error(message.error);
				return;
			}

			if (message.type === 'next') {
				subject.next(message.value);
				return;
			}

			if (message.type === 'complete') {
				unsubscribe();
				subject.complete();

				const next = this.pendingTasks.shift();

				if (next) {
					this.runNext(worker, next);
				} else {
					this.pool.push(worker);
				}
			}
		};

		worker.on('error', handleError);
		worker.on('messageerror', handleError);
		worker.on('exit', handleExit);
		worker.on('message', handleMessage);

		worker.postMessage(task);
	}

	addTask(task: Task) {
		const pending = {
			task,
			subject: new Subject<Value>(),
		};

		this.pendingTasks.push(pending);

		const worker = this.pool.pop();

		if (worker) {
			this.runNext(worker);
		}

		return pending.subject.asObservable();
	}

	async close() {
		await Promise.all(this.pendingTasks.map(({ subject }) => lastValueFrom(subject, { defaultValue: null })));
		await Promise.all(this.workers.map((worker) => worker.terminate()));
	}
}
