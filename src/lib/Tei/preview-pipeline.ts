import { createViewModel } from './createViewModel.js';
import type { CudlObject, ViewModel } from './createViewModel.js';
import {
	transformXmlDocToJson,
	transformXmlDocToXml,
	type TransformDisplayError,
	type TransformOutcome
} from './preview-transform.js';
import { isValidPreviewConfig, type PreviewConfig } from './preview-utils.js';

export type { CudlObject, ViewModel } from './createViewModel.js';
export type { TransformDisplayError } from './preview-transform.js';
export type { PreviewConfig } from './preview-utils.js';

export async function runPreviewPreTransform(
	xmlDoc: XMLDocument | null | undefined,
	stylesheetInternal: unknown
): Promise<TransformOutcome<XMLDocument>> {
	return transformXmlDocToXml(xmlDoc, stylesheetInternal, { cleanFacsimile: true });
}

export async function runPreviewJsonTransform(
	xmlDoc: XMLDocument | null | undefined,
	stylesheetInternal: unknown
): Promise<TransformOutcome<CudlObject>> {
	return transformXmlDocToJson(xmlDoc, stylesheetInternal);
}

export function createPreviewViewModel(
	cudlJson: CudlObject | null,
	config: PreviewConfig | undefined
): ViewModel | null {
	if (!cudlJson || !isValidPreviewConfig(config)) return null;

	const cudlJsonCopy = JSON.parse(JSON.stringify(cudlJson)) as CudlObject;
	return createViewModel(cudlJsonCopy, config);
}
