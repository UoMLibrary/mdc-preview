export type TransformStage = 'idle' | 'waiting-for-input' | 'transforming' | 'complete';
export type ProgressStepStatus = 'pending' | 'active' | 'done' | 'error';

export interface TransformProgressStep {
	label: string;
	detail?: string;
	status: ProgressStepStatus;
}

export interface GuardedTransformRunner<T> {
	isStale: () => boolean;
	run: () => Promise<T>;
	applyResult: (result: T) => void;
	applyError: (error: unknown) => void;
	release?: () => void;
}

export async function runGuardedTransform<T>(runner: GuardedTransformRunner<T>) {
	try {
		const result = await runner.run();
		if (runner.isStale()) return;

		runner.applyResult(result);
	} catch (error) {
		if (runner.isStale()) return;

		runner.applyError(error);
	} finally {
		releaseGuardedTransform(runner);
	}
}

export function getTransformInputStage(hasSource: boolean, hasStylesheet: boolean): TransformStage {
	if (hasSource) return hasStylesheet ? 'transforming' : 'idle';
	if (hasStylesheet) return 'waiting-for-input';

	return 'idle';
}

export function getTransformEndStage<T>(
	value: T | null,
	error: unknown,
	hasTransformInput: boolean
): TransformStage {
	if (error) return 'idle';
	if (value) return 'complete';
	if (!hasTransformInput) return 'waiting-for-input';

	return 'idle';
}

export function getStylesheetTransformEndStage<T>(
	value: T | null,
	error: unknown,
	hasSource: boolean,
	hasStylesheet: boolean
): TransformStage {
	if (error) return 'idle';
	if (value) return 'complete';
	if (isWaitingForSource(hasSource, hasStylesheet)) return 'waiting-for-input';

	return 'idle';
}

export function getProgressStatus(stage: TransformStage, hasError: boolean): ProgressStepStatus {
	if (hasError) return 'error';
	if (stage === 'transforming') return 'active';
	if (stage === 'complete') return 'done';

	return 'pending';
}

export function hasProgressStarted(stages: TransformStage[]) {
	return stages.some(isStartedStage);
}

function isStartedStage(stage: TransformStage) {
	return stage !== 'idle' && stage !== 'waiting-for-input';
}

function releaseGuardedTransform<T>(runner: GuardedTransformRunner<T>) {
	runner.release?.();
}

function isWaitingForSource(hasSource: boolean, hasStylesheet: boolean) {
	return hasStylesheet && !hasSource;
}
