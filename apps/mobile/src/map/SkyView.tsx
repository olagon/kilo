import './worker';
import { Map as MLMap, type AJAXError, type ErrorEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { SkyView as SkyViewData } from '@huli/shared';
import { buildSkyStyle, countTileRequest, getImageryProvider, reportTileError, skyCredit } from './imagery';

export interface SkyViewHandle {
  faceNorth(): void;
}
export interface SkyViewProps {
  view: SkyViewData;
  /** false = home backdrop, no touch */
  interactive?: boolean;
  /** slow idle swivel for the home backdrop */
  autoSwivel?: boolean;
  dataSaver?: boolean;
  reducedMotion?: boolean;
  onReady?: () => void;
  className?: string;
}

const BEARING_PER_PX = 0.35;
const PITCH_PER_PX = 0.25;
const MAX_PITCH = 70;
const AUTO_DEG_PER_S = 1.5;

export const SkyView = forwardRef<SkyViewHandle, SkyViewProps>(function SkyView(
  { view, interactive = true, autoSwivel = false, dataSaver = false, reducedMotion = false, onReady, className },
  ref,
) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [bearing, setBearing] = useState(view.bearing);
  const touching = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useImperativeHandle(ref, () => ({
    faceNorth() {
      mapRef.current?.easeTo({ bearing: 0, duration: reducedMotion ? 0 : 600 });
    },
  }));

  // Create the map once; one WebGL context per view.
  useEffect(() => {
    if (!el.current) return;
    const map = new MLMap({
      container: el.current,
      style: buildSkyStyle({ dataSaver }),
      center: [view.lon, view.lat],
      zoom: view.zoom,
      minZoom: view.zoom,
      maxZoom: view.zoom,
      pitch: view.pitch,
      bearing: view.bearing,
      maxPitch: MAX_PITCH,
      attributionControl: false,
      fadeDuration: 0,
      renderWorldCopies: false,
      interactive: false,
      transformRequest: countTileRequest,
    });
    map.getCanvas().style.outline = 'none';
    map.once('idle', () => onReadyRef.current?.());
    map.on('rotate', () => setBearing(map.getBearing()));
    map.on('error', (e: ErrorEvent) => {
      const err = e.error as Partial<AJAXError> | undefined;
      if (!err?.status || err.url?.includes('elevation-tiles-prod')) return;
      const before = getImageryProvider().id;
      reportTileError(err.status);
      if (getImageryProvider().id !== before) map.setStyle(buildSkyStyle({ dataSaver }));
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Camera follows the view prop; the lock follows the zoom.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setMinZoom(view.zoom);
    map.setMaxZoom(view.zoom);
    map.jumpTo({ center: [view.lon, view.lat], zoom: view.zoom, pitch: view.pitch, bearing: view.bearing });
  }, [view.lat, view.lon, view.zoom, view.pitch, view.bearing]);

  useEffect(() => {
    mapRef.current?.setStyle(buildSkyStyle({ dataSaver }));
  }, [dataSaver]);

  // Idle swivel for the home backdrop.
  useEffect(() => {
    if (!autoSwivel || reducedMotion) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const map = mapRef.current;
      const dt = (t - last) / 1000;
      last = t;
      if (map && !touching.current) map.setBearing(map.getBearing() + AUTO_DEG_PER_S * dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoSwivel, reducedMotion]);

  // One finger swivel with momentum, two finger twist.
  useEffect(() => {
    const node = el.current;
    if (!node || !interactive) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let vel = 0; // bearing degrees per frame
    let lastT = 0;
    let raf = 0;
    let twistAngle = 0;

    const angle = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI : 0;
    };
    const momentum = () => {
      const map = mapRef.current;
      if (!map || Math.abs(vel) < 0.02) return;
      map.setBearing(map.getBearing() + vel);
      vel *= 0.93;
      raf = requestAnimationFrame(momentum);
    };

    const down = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      vel = 0;
      touching.current = true;
      node.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) twistAngle = angle();
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      const map = mapRef.current;
      if (!prev || !map) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2) {
        const a = angle();
        map.setBearing(map.getBearing() + (a - twistAngle));
        twistAngle = a;
        return;
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      const now = performance.now();
      const dBearing = -dx * BEARING_PER_PX;
      map.jumpTo({
        bearing: map.getBearing() + dBearing,
        pitch: Math.max(0, Math.min(MAX_PITCH, map.getPitch() + dy * PITCH_PER_PX)),
      });
      // frames at ~60 Hz; scale the per-event delta to a per-frame velocity
      vel = now - lastT > 0 ? dBearing * Math.min(1, 16.7 / (now - lastT)) : dBearing;
      lastT = now;
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        touching.current = false;
        if (!reducedMotion && performance.now() - lastT < 80) raf = requestAnimationFrame(momentum);
      }
    };
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    return () => {
      cancelAnimationFrame(raf);
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
    };
  }, [interactive, reducedMotion]);

  return (
    <div className={`huli-sky ${className ?? ''}`} aria-label="Satellite view. Drag to look around.">
      <div ref={el} className="huli-sky-canvas" style={{ touchAction: 'none' }} />
      <div className="huli-sky-vignette" aria-hidden="true" />
      {interactive && (
        <button
          type="button"
          className="huli-compass"
          aria-label="Face north"
          onClick={() => mapRef.current?.easeTo({ bearing: 0, duration: reducedMotion ? 0 : 600 })}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" style={{ transform: `rotate(${-bearing}deg)` }} aria-hidden="true">
            <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
            <path d="M12 3 L15 12 L12 10.5 L9 12 Z" fill="var(--lehua)" />
            <path d="M12 21 L9 12 L12 13.5 L15 12 Z" fill="currentColor" opacity="0.7" />
          </svg>
        </button>
      )}
      <div className="huli-credit" aria-label={`Imagery: ${skyCredit()}`}>{skyCredit()}</div>
    </div>
  );
});
