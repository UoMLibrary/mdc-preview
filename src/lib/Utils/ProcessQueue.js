// ProcessQueue.js
'use strict';

export default class ProcessQueue {
	constructor(options = {}) {
		Object.assign(
			this,
			{
				queue: [],
				activeJobCount: 0,
				jobLimit: 10,
				completedCount: 0,
				label: 'ProcessQueue'
			},
			options
		);
	}

	print() {
		return this;
	}

	addJob(jobData) {
		this.queue.push(jobData);
		this.checkQueue();
	}

	// Runs a job when it can, doesn't enforce the order
	async checkQueue() {
		if (this.queue.length > 0 && this.activeJobCount < this.jobLimit) {
			// console.log("this.activeJobCount < this.jobLimit", this.activeJobCount < this.jobLimit);
			// console.log("Run next job");
			let promise_job = this.queue.shift(); // remove from the queue ready to process it

			this.activeJobCount++;

			await promise_job();

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
				this.checkQueue();
			}
		}
	}
}
