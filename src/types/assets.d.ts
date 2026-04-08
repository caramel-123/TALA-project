declare module '*?url' {
  const src: string;
  export default src;
}

declare module '*.geojson' {
  const value: unknown;
  export default value;
}

declare module '*.css';

declare module 'maplibre-gl/dist/maplibre-gl.css';
