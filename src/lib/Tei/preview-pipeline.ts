import { createViewModel } from './createViewModel.js';
import type { CudlObject, ViewModel } from './createViewModel.js';
import {
	transformXmlDocToJson,
	transformXmlDocToXml,
	type TransformDisplayError,
	type TransformOutcome,
	type TransformProgressMessage
} from './preview-transform.js';
import { isValidPreviewConfig, type PreviewConfig } from './preview-utils.js';

export type { CudlObject, ViewModel } from './createViewModel.js';
export type { TransformDisplayError, TransformProgressMessage } from './preview-transform.js';
export type { PreviewConfig } from './preview-utils.js';

export async function runPreviewPreTransform(
	xmlDoc: XMLDocument | null | undefined,
	stylesheetInternal: unknown,
	progress?: (message: TransformProgressMessage) => void
): Promise<TransformOutcome<XMLDocument>> {
	return transformXmlDocToXml(xmlDoc, stylesheetInternal, { cleanFacsimile: true, progress });
}

export async function runPreviewJsonTransform(
	xmlDoc: XMLDocument | null | undefined,
	stylesheetInternal: unknown,
	progress?: (message: TransformProgressMessage) => void
): Promise<TransformOutcome<CudlObject>> {
	return transformXmlDocToJson(xmlDoc, stylesheetInternal, { progress });
}

export function createPreviewViewModel(
	cudlJson: CudlObject | null,
	config: PreviewConfig | undefined
): ViewModel | null {
	if (!cudlJson || !isValidPreviewConfig(config)) return null;

	const cudlJsonCopy = JSON.parse(JSON.stringify(cudlJson)) as CudlObject;
	return createViewModel(cudlJsonCopy, config);
}
