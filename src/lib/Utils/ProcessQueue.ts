type ProcessQueueJob = () => Promise<void> | void;
type ProgressCallback = (label: string, progress: number) => void;
type CompleteCallback = () => Promise<void> | void;

interface ProcessQueueOptions {
	queue?: ProcessQueueJob[];
	activeJobCount?: number;
	jobLimit?: number;
	completedCount?: number;
	label?: string;
	totalCount?: number;
	progressCallback?: ProgressCallback;
	completeCallback?: CompleteCallback;
}

export default class ProcessQueue {
	queue: ProcessQueueJob[] = [];
	activeJobCount = 0;
	jobLimit = 10;
	completedCount = 0;
	label = 'ProcessQueue';
	totalCount?: number;
	progressCallback?: ProgressCallback;
	completeCallback?: CompleteCallback;

	constructor(options: ProcessQueueOptions = {}) {
		Object.assign(this, options);
	}

	addJob(jobData: ProcessQueueJob) {
		this.queue.push(jobData);
		void this.checkQueue();
	}

	// Runs a job when it can, doesn't enforce the order
	async checkQueue() {
		if (!this.canRunNextJob()) return;

		const promiseJob = this.queue.shift(); // remove from the queue ready to process it
		if (!promiseJob) return;

		this.startJob();
		await promiseJob();
		this.finishJob();

		if (this.isComplete()) {
			await this.complete();
			return;
		}

		void this.checkQueue();
	}

	private canRunNextJob() {
		return this.queue.length > 0 && this.activeJobCount < this.jobLimit;
	}

	private startJob() {
		this.activeJobCount++;
	}

	private finishJob() {
		this.completedCount++;
		this.activeJobCount--;
		this.reportProgress();
	}

	private reportProgress() {
		if (!this.progressCallback || !this.totalCount) return;

		this.progressCallback(this.label, Math.round((this.completedCount / this.totalCount) * 100));
	}

	private isComplete() {
		return !!this.totalCount && !!this.completeCallback && this.totalCount === this.completedCount;
	}

	private async complete() {
		this.activeJobCount = 0;
		this.completedCount = 0;
		await this.completeCallback?.();
	}
}
