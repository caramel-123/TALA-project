/// <reference types="vite/client" />

declare module '*.geojson?url' {
	const src: string;
	export default src;
}

declare module 'maplibre-gl/dist/maplibre-gl.css';
