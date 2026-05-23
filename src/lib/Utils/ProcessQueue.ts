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
		if (this.queue.length > 0 && this.activeJobCount < this.jobLimit) {
			// console.log("this.activeJobCount < this.jobLimit", this.activeJobCount < this.jobLimit);
			// console.log("Run next job");
			const promiseJob = this.queue.shift(); // remove from the queue ready to process it
			if (!promiseJob) return;

			this.activeJobCount++;

			await promiseJob();

			this.completedCount++;
			this.activeJobCount--;

			if (this.progressCallback && this.totalCount) {
				//console.log(this.completedCount, this.totalCount, this.completedCount / this.totalCount);
				this.progressCallback(
					this.label,
					Math.round((this.completedCount / this.totalCount) * 100)
				);
			}

			// Are all the jobs complete
			//console.log(this.totalCount, this.completedCount);
			if (this.totalCount && this.completeCallback && this.totalCount === this.completedCount) {
				this.activeJobCount = 0;
				this.completedCount = 0;
				this.completeCallback();
			} else {
				void this.checkQueue();
			}
		}
	}
}
