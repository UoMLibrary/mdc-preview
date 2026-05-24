export const previewSefIds = {
	preTransform: 'preTransform',
	jsonTransform: 'JSONTransform'
} as const;

export type PreviewSefId = (typeof previewSefIds)[keyof typeof previewSefIds];
