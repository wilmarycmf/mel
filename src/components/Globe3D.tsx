/**
 * GlobalPulse — textured 3D globe (WebGL, react-globe.gl / three.js).
 *
 * Replaces the hand-rolled SVG projection with a real rotating, lit sphere
 * textured in NASA Blue Marble imagery, close to a Google-Earth-style view.
 * Signal placement, filtering and selection behaviour match the previous
 * `Globe` component's props exactly so callers don't need to change.
 */

import { useEffect, useMemo, useRef } from 'react';
import ReactGlobe, { type GlobeMethods } from 'react-globe.gl';
import type { Filter, Signal } from '../types';
import earthTexture from '../assets/earth-blue-marble.jpg';
import earthBumpMap from '../assets/earth-topology.png';

const MARKER_COLOR: Record<Signal['type'], string> = {
  PROGRESS: '#59c7ae',
  BREAKTHROUGH: '#f4c870',
  NEEDS_ATTENTION: '#ee8890',
  RECOVERY: '#6bc9ed',
};

export interface GlobeProps {
  signals: Signal[];
  filter: Filter;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Imperative "rotate toward this signal". */
  rotateToSignalId: string | null;
}

/**
 * Builds a pin-shaped DOM marker (teardrop + dot), coloured by signal type
 * and sized well above the default WebGL point sprite so it stays legible
 * at any zoom level. Rendered via `htmlElement` instead of the "points"
 * layer, which is what made the old markers tiny flat dots.
 */
function makePinElement(signal: Signal, selected: boolean, onSelect: (id: string) => void): HTMLElement {
  const color = MARKER_COLOR[signal.type] ?? '#59c7ae';
  const size = selected ? 34 : 26;
  const el = document.createElement('div');
  el.className = `gp-pin${selected ? ' gp-pin--selected' : ''}`;
  el.title = signal.title;
  el.style.cssText = `
    width:${size}px;height:${size}px;cursor:pointer;transform:translate(-50%,-100%);
    pointer-events:auto;
    filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))${selected ? ' drop-shadow(0 0 6px #fff)' : ''};
  `;
  el.innerHTML = `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}">
      <path d="M12 0C6.5 0 2 4.5 2 10c0 7.5 10 14 10 14s10-6.5 10-14c0-5.5-4.5-10-10-10z"
            fill="${color}" stroke="${selected ? '#ffffff' : '#07101d'}" stroke-width="1.2" />
      <circle cx="12" cy="10" r="4" fill="#07101d" opacity="0.55" />
    </svg>
  `;
  el.addEventListener('click', (event) => {
    event.stopPropagation();
    onSelect(signal.id);
  });
  return el;
}

export function Globe({ signals, filter, selectedId, onSelect, rotateToSignalId }: GlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

  const visibleSignals = useMemo(() => {
    return signals.filter((s) => {
      if (filter.type !== 'WORLD' && s.type !== filter.type) return false;
      if (filter.category && s.category !== filter.category) return false;
      return true;
    });
  }, [signals, filter]);

  // Initial camera position — no need to wait for user input to see the world.
  useEffect(() => {
    globeRef.current?.pointOfView({ lat: 15, lng: 10, altitude: 2.2 }, 0);
  }, []);

  // "Rotate to centre on selected signal" — same behaviour the SVG globe had.
  useEffect(() => {
    if (!rotateToSignalId) return;
    const target = signals.find((s) => s.id === rotateToSignalId);
    if (!target) return;
    globeRef.current?.pointOfView({ lat: target.latitude, lng: target.longitude, altitude: 1.5 }, 1000);
  }, [rotateToSignalId, signals]);

  return (
    <div className="gp-globe" role="region" aria-label="Living world map">
      <ReactGlobe
        ref={globeRef}
        width={1000}
        height={500}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={earthTexture}
        bumpImageUrl={earthBumpMap}
        showAtmosphere
        atmosphereColor="#7db8e8"
        atmosphereAltitude={0.18}
        htmlElementsData={visibleSignals}
        htmlLat={(d) => (d as Signal).latitude}
        htmlLng={(d) => (d as Signal).longitude}
        htmlAltitude={0.01}
        htmlElement={(d) => makePinElement(d as Signal, (d as Signal).id === selectedId, onSelect)}
      />
    </div>
  );
}
