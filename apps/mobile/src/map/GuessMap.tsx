import './worker';
import { GeoJSONSource, LngLatBounds, Map as MLMap, type MapMouseEvent, Marker, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useEffect, useRef } from 'react';
import type { LatLon } from '@huli/shared';

export interface GuessMapProps {
  pin: LatLon | null;
  onPin: (p: LatLon) => void;
  /** When set, the map animates the reveal: fit both, draw the line, then call onRevealDone. */
  reveal?: { guess: LatLon | null; answer: LatLon } | null;
  onRevealDone?: () => void;
  hawaiianNames?: boolean;
  reducedMotion?: boolean;
  disabled?: boolean;
  className?: string;
  /** Extra bottom padding (px) for the reveal fit so the result card doesn't cover the pins. */
  revealBottomPadding?: number;
}

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const MAX_BOUNDS: [[number, number], [number, number]] = [[-161.8, 17.2], [-153.4, 23.9]]; // wide enough for a portrait screen to zoom out
const HOME_BOUNDS: [[number, number], [number, number]] = [[-160.3, 18.85], [-154.75, 22.3]];

let stylePromise: Promise<StyleSpecification> | null = null;
function fetchStyle() {
  return (stylePromise ??= fetch(STYLE_URL).then((r) => r.json() as Promise<StyleSpecification>));
}

function isDark() {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
}

/** Recolor OpenFreeMap Liberty to the Huli palette and drop the clutter. */
function restyle(base: StyleSpecification, hawaiianNames: boolean): StyleSpecification {
  const dark = isDark();
  const layers = base.layers
    .filter((l) => !/poi|housenum|transit/.test(l.id))
    .map((l) => {
      const layer = structuredClone(l);
      const paint = (layer.paint ??= {}) as Record<string, unknown>;
      if (layer.id === 'background') paint['background-color'] = dark ? '#182d38' : '#f1f0ea';
      if (layer.id === 'water') paint['fill-color'] = dark ? '#1e6b8a' : '#8fc3d8';
      if (layer.type === 'line' && layer.id.startsWith('waterway')) paint['line-color'] = dark ? '#2a7d9e' : '#7ab4cb';
      if (layer.id === 'natural_earth') paint['raster-opacity'] = dark ? 0.15 : 0.5;
      if (dark && layer.type === 'symbol') {
        paint['text-color'] = '#eef5f3';
        paint['text-halo-color'] = '#0a1a24';
      }
      if (dark && (layer.type === 'fill' || layer.type === 'fill-extrusion') && layer.id !== 'water') {
        paint['fill-opacity'] = 0.35;
      }
      if (dark && layer.type === 'line' && layer.id.startsWith('road')) paint['line-color'] = '#52707c';
      if (hawaiianNames && layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout) {
        layer.layout['text-field'] = ['coalesce', ['get', 'name:haw'], ['get', 'name']] as never;
      }
      return layer;
    });
  return { ...base, layers };
}

function pinEl(kind: 'guess' | 'answer') {
  const span = document.createElement('span');
  span.className = `huli-pin huli-pin--${kind}`;
  span.setAttribute('aria-label', kind === 'guess' ? 'Your guess' : 'The answer');
  span.innerHTML = pinSvg(kind === 'guess' ? 'var(--ilima)' : 'var(--lehua)');
  return span;
}

function pinSvg(fill: string) {
  return `<svg viewBox="0 0 30 40" width="30" height="40" aria-hidden="true"><path d="M15 1.5C7.8 1.5 2 7.3 2 14.5c0 9.3 11.2 22.3 12.3 23.5a1 1 0 0 0 1.4 0C16.8 36.8 28 23.8 28 14.5 28 7.3 22.2 1.5 15 1.5z" fill="${fill}" stroke="#0a1a24" stroke-width="2"/><circle cx="15" cy="14.5" r="5" fill="#0a1a24"/></svg>`;
}

/** Small pin for legends and lists. */
export function PinIcon({ kind = 'guess', size = 16 }: { kind?: 'guess' | 'answer'; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-block', width: size, height: (size * 4) / 3, verticalAlign: '-0.2em' }}
      dangerouslySetInnerHTML={{ __html: pinSvg(kind === 'guess' ? 'var(--ilima)' : 'var(--lehua)') }}
    />
  );
}

export function GuessMap({ pin, onPin, reveal, onRevealDone, hawaiianNames = false, reducedMotion = false, disabled = false, className, revealBottomPadding = 0 }: GuessMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const guessMarker = useRef<Marker | null>(null);
  const answerMarker = useRef<Marker | null>(null);
  const loaded = useRef(false);
  const latest = useRef({ onPin, onRevealDone, disabled, reveal });
  latest.current = { onPin, onRevealDone, disabled, reveal };

  const haptic = () => Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

  useEffect(() => {
    if (!el.current) return;
    let map: MLMap | null = null;
    let cancelled = false;
    fetchStyle().then((base) => {
      if (cancelled || !el.current) return;
      const m = new MLMap({
        container: el.current,
        style: restyle(base, hawaiianNames),
        bounds: HOME_BOUNDS,
        fitBoundsOptions: { padding: 24 },
        maxBounds: MAX_BOUNDS,
        minZoom: 5.5,
        maxZoom: 17,
        attributionControl: false,
        pitchWithRotate: false,
        dragRotate: false,
        touchPitch: false,
        renderWorldCopies: false,
      });
      m.touchZoomRotate.disableRotation();
      m.keyboard.disableRotation();
      m.getCanvas().style.outline = 'none';
      m.on('click', (e: MapMouseEvent) => {
        if (latest.current.disabled || latest.current.reveal) return;
        haptic();
        latest.current.onPin({ lat: e.lngLat.lat, lon: e.lngLat.lng });
      });
      m.once('load', () => {
        loaded.current = true;
        placePin(m, pin);
        if (latest.current.reveal) runReveal(m, latest.current.reveal);
      });
      map = mapRef.current = m;
    });
    return () => {
      cancelled = true;
      loaded.current = false;
      guessMarker.current = answerMarker.current = null;
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map && loaded.current) map.setStyle(restyle(map.getStyle(), hawaiianNames));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hawaiianNames]);

  function placePin(map: MLMap, p: LatLon | null) {
    if (!p) {
      guessMarker.current?.remove();
      guessMarker.current = null;
      return;
    }
    if (!guessMarker.current) {
      guessMarker.current = new Marker({ element: pinEl('guess'), anchor: 'bottom', draggable: true })
        .setLngLat([p.lon, p.lat])
        .addTo(map);
      guessMarker.current.on('dragend', () => {
        const ll = guessMarker.current!.getLngLat();
        haptic();
        latest.current.onPin({ lat: ll.lat, lon: ll.lng });
      });
    } else {
      guessMarker.current.setLngLat([p.lon, p.lat]);
    }
    guessMarker.current.setDraggable(!latest.current.disabled && !latest.current.reveal);
  }

  useEffect(() => {
    const map = mapRef.current;
    if (map && loaded.current) placePin(map, pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, disabled]);

  function runReveal(map: MLMap, r: NonNullable<GuessMapProps['reveal']>) {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      latest.current.onRevealDone?.();
    };
    guessMarker.current?.setDraggable(false);
    map.setMaxBounds(null);
    answerMarker.current?.remove();
    answerMarker.current = new Marker({ element: pinEl('answer'), anchor: 'bottom' })
      .setLngLat([r.answer.lon, r.answer.lat])
      .addTo(map);
    const duration = reducedMotion ? 0 : 900;
    // The container may have just been laid out. Settle size first, then move the camera and
    // wait for the move by time, not by 'moveend', which a late resize can fire early.
    map.resize();
    requestAnimationFrame(() => {
      if (!mapRef.current) return;
      const pad = { top: 96, bottom: revealBottomPadding + 48, left: 56, right: 56 };
      if (!r.guess) {
        map.flyTo({ center: [r.answer.lon, r.answer.lat], zoom: 10, duration, padding: pad });
        window.setTimeout(finish, duration + 80);
        return;
      }
      const guess = r.guess;
      const bounds = new LngLatBounds([guess.lon, guess.lat], [guess.lon, guess.lat]).extend([r.answer.lon, r.answer.lat]);
      const cam = map.cameraForBounds(bounds, { padding: pad, maxZoom: 12 });
      if (cam) map.easeTo({ ...cam, duration });
      window.setTimeout(() => {
        if (!mapRef.current) return;
        if (!map.getSource('reveal-line')) {
          map.addSource('reveal-line', { type: 'geojson', data: lineData(guess, guess) });
          map.addLayer({ id: 'reveal-line-casing', type: 'line', source: 'reveal-line', paint: { 'line-color': '#0a1a24', 'line-width': 4 }, layout: { 'line-cap': 'round' } });
          map.addLayer({ id: 'reveal-line', type: 'line', source: 'reveal-line', paint: { 'line-color': '#f2a900', 'line-width': 2 }, layout: { 'line-cap': 'round' } });
        }
        const src = map.getSource('reveal-line') as GeoJSONSource;
        if (reducedMotion) {
          src.setData(lineData(guess, r.answer));
          finish();
          return;
        }
        const start = performance.now();
        const grow = (t: number) => {
          if (!mapRef.current) return;
          const k = Math.min(1, (t - start) / 700);
          const e = 1 - (1 - k) ** 3;
          src.setData(lineData(guess, { lat: guess.lat + (r.answer.lat - guess.lat) * e, lon: guess.lon + (r.answer.lon - guess.lon) * e }));
          if (k < 1) requestAnimationFrame(grow);
          else finish();
        };
        requestAnimationFrame(grow);
      }, duration + 80);
    });
  }

  function clearReveal(map: MLMap) {
    map.setMaxBounds(MAX_BOUNDS);
    answerMarker.current?.remove();
    answerMarker.current = null;
    if (map.getLayer('reveal-line')) map.removeLayer('reveal-line');
    if (map.getLayer('reveal-line-casing')) map.removeLayer('reveal-line-casing');
    if (map.getSource('reveal-line')) map.removeSource('reveal-line');
    guessMarker.current?.setDraggable(!latest.current.disabled);
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded.current) return;
    if (reveal) runReveal(map, reveal);
    else clearReveal(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal]);

  return (
    <div className={`huli-guess ${className ?? ''}`} role="application" aria-label="Map of Hawaiʻi. Tap to drop your pin.">
      <div ref={el} className="huli-guess-canvas" style={{ touchAction: 'none' }} />
    </div>
  );
}

function lineData(a: LatLon, b: LatLon) {
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [[a.lon, a.lat], [b.lon, b.lat]] } };
}
