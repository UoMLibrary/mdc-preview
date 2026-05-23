export type PanelStatus = '' | 'ERROR' | 'SUCCESS';

export function getPanelStatus(hasErrors: boolean, hasContent: boolean): PanelStatus {
	if (hasErrors) return 'ERROR';
	if (hasContent) return 'SUCCESS';

	return '';
}
