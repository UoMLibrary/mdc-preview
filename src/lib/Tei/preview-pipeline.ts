import { createViewModel } from './createViewModel.js';
import type { CudlObject, ViewModel } from './createViewModel.js';
import {
	transformXmlDocToJson,
	transformXmlDocToSerializedXml,
	transformXmlDocToXml,
	transformXmlStringToJson,
	type TransformDisplayError,
	type TransformOutcome,
	type TransformProgressMessage
} from './preview-transform.js';
import { isValidPreviewConfig, type PreviewConfig } from './preview-utils.js';

export type { CudlObject, ViewModel } from './createViewModel.js';
export type { TransformDisplayError, TransformProgressMessage } from './preview-transform.js';
export type { PreviewConfig } from './preview-utils.js';

interface PreviewTransformOptions {
	progress?: (message: TransformProgressMessage) => void;
	signal?: AbortSignal;
}

export async function runPreviewPreTransform(
	xmlDoc: XMLDocument | null | undefined,
	stylesheetInternal: unknown,
	options: PreviewTransformOptions = {}
): Promise<TransformOutcome<XMLDocument>> {
	return transformXmlDocToXml(xmlDoc, stylesheetInternal, { cleanFacsimile: true, ...options });
}

export async function runPreviewPreTransformToString(
	xmlDoc: XMLDocument | null | undefined,
	stylesheetInternal: unknown,
	options: PreviewTransformOptions = {}
): Promise<TransformOutcome<string>> {
	return transformXmlDocToSerializedXml(xmlDoc, stylesheetInternal, {
		cleanFacsimile: true,
		...options
	});
}

export async function runPreviewJsonTransform(
	xmlDoc: XMLDocument | null | undefined,
	stylesheetInternal: unknown,
	options: PreviewTransformOptions = {}
): Promise<TransformOutcome<CudlObject>> {
	return transformXmlDocToJson(xmlDoc, stylesheetInternal, options);
}

export async function runPreviewJsonTransformFromString(
	xmlString: string | null | undefined,
	stylesheetInternal: unknown,
	options: PreviewTransformOptions = {}
): Promise<TransformOutcome<CudlObject>> {
	return transformXmlStringToJson(xmlString ?? '', stylesheetInternal, options);
}

export function createPreviewViewModel(
	cudlJson: CudlObject | null,
	config: PreviewConfig | undefined
): ViewModel | null {
	if (!cudlJson || !isValidPreviewConfig(config)) return null;

	const cudlJsonCopy = JSON.parse(JSON.stringify(cudlJson)) as CudlObject;
	return createViewModel(cudlJsonCopy, config);
}
