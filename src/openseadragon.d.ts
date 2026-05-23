declare module 'openseadragon' {
	export interface Viewer {
		open(tileSources: unknown[], initialPage?: number): void;
		addHandler(eventName: string, handler: () => void): void;
		removeHandler(eventName: string, handler: () => void): void;
		destroy(): void;
		viewport: {
			setRotation(rotation: number): void;
		};
	}

	const OpenSeadragon: new (options: Record<string, unknown>) => Viewer;

	export default OpenSeadragon;
}
