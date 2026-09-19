/**
 * Stable, lightweight orthographic Earth view.
 *
 * Signal coordinates come from the API. Global aggregate signals deliberately
 * use visual anchors rather than a factual point on Earth; the scope note in
 * the UI makes that distinction explicit.
 */

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import type { Filter, Signal } from '../types';
import { cx } from './util';
import { projectPoint, wrapLongitude, type LatLon } from '../lib/geo';

const VIEW_W = 900;
const VIEW_H = 560;
const RADIUS = 238;
const CENTRE_X = VIEW_W / 2;
const CENTRE_Y = VIEW_H / 2;
const ZOOM_MIN = 0.82;
const ZOOM_MAX = 1.42;

const GLOBAL_ANCHORS: Record<string, LatLon> = {
  'real-galaxy-zoo': { latitude: 21, longitude: -28 },
  'real-measles-coverage': { latitude: 2, longitude: 8 },
  'real-clump-scout': { latitude: -20, longitude: 33 },
};

const CONTINENT_OUTLINES: LatLon[][] = [
  [
    { latitude: 70, longitude: -168 }, { latitude: 72, longitude: -136 }, { latitude: 66, longitude: -102 },
    { latitude: 57, longitude: -76 }, { latitude: 48, longitude: -58 }, { latitude: 30, longitude: -80 },
    { latitude: 20, longitude: -96 }, { latitude: 28, longitude: -116 }, { latitude: 44, longitude: -124 },
    { latitude: 58, longitude: -142 }, { latitude: 70, longitude: -168 },
  ],
  [
    { latitude: 12, longitude: -78 }, { latitude: 8, longitude: -56 }, { latitude: -5, longitude: -36 },
    { latitude: -24, longitude: -46 }, { latitude: -45, longitude: -67 }, { latitude: -54, longitude: -72 },
    { latitude: -30, longitude: -72 }, { latitude: -10, longitude: -76 }, { latitude: 12, longitude: -78 },
  ],
  [
    { latitude: 36, longitude: -10 }, { latitude: 64, longitude: -7 }, { latitude: 72, longitude: 34 },
    { latitude: 71, longitude: 90 }, { latitude: 69, longitude: 145 }, { latitude: 55, longitude: 164 },
    { latitude: 38, longitude: 121 }, { latitude: 8, longitude: 103 }, { latitude: 10, longitude: 79 },
    { latitude: 27, longitude: 54 }, { latitude: 39, longitude: 27 }, { latitude: 36, longitude: -10 },
  ],
  [
    { latitude: 35, longitude: -15 }, { latitude: 37, longitude: 12 }, { latitude: 31, longitude: 32 },
    { latitude: 12, longitude: 44 }, { latitude: -2, longitude: 41 }, { latitude: -17, longitude: 39 },
    { latitude: -35, longitude: 20 }, { latitude: -18, longitude: 11 }, { latitude: 1, longitude: 8 },
    { latitude: 5, longitude: -8 }, { latitude: 35, longitude: -15 },
  ],
  [
    { latitude: -12, longitude: 130 }, { latitude: -11, longitude: 142 }, { latitude: -27, longitude: 153 },
    { latitude: -39, longitude: 146 }, { latitude: -34, longitude: 116 }, { latitude: -22, longitude: 114 },
    { latitude: -12, longitude: 130 },
  ],
];

interface PlacedSignal {
  signal: Signal;
  position: LatLon;
  x: number;
  y: number;
  visible: boolean;
  facing: number;
  offsetX: number;
  offsetY: number;
}

function isGlobalSignal(signal: Signal): boolean {
  return signal.country === 'Global' || signal.country === 'World' || signal.region === 'Global';
}

function displayPosition(signal: Signal, index: number): LatLon {
  if (!isGlobalSignal(signal)) return { latitude: signal.latitude, longitude: signal.longitude };
  if (GLOBAL_ANCHORS[signal.id]) return GLOBAL_ANCHORS[signal.id];
  // Fallback for a future global aggregate: a deterministic display anchor,
  // not a claimed geographical event coordinate.
  const angle = (index * 53 + 18) * (Math.PI / 180);
  return { latitude: Math.sin(angle) * 28, longitude: Math.cos(angle) * 58 };
}

function separateMarkers(markers: PlacedSignal[]): PlacedSignal[] {
  const placed = markers.map((marker) => ({ ...marker }));
  for (let pass = 0; pass < 3; pass += 1) {
    for (let a = 0; a < placed.length; a += 1) {
      for (let b = a + 1; b < placed.length; b += 1) {
        const first = placed[a];
        const second = placed[b];
        if (!first.visible || !second.visible) continue;
        const dx = (second.x + second.offsetX) - (first.x + first.offsetX);
        const dy = (second.y + second.offsetY) - (first.y + first.offsetY);
        const distance = Math.hypot(dx, dy);
        if (distance >= 25) continue;
        const angle = distance === 0 ? (a * 71 + b * 131) * (Math.PI / 180) : Math.atan2(dy, dx);
        const nudge = (25 - distance) / 2;
        const x = Math.cos(angle) * nudge;
        const y = Math.sin(angle) * nudge;
        first.offsetX -= x; first.offsetY -= y;
        second.offsetX += x; second.offsetY += y;
      }
    }
  }
  return placed;
}

function outlinePath(outline: LatLon[], rotation: number): string {
  let open = false;
  const segments: string[] = [];
  for (const point of outline) {
    const projected = projectPoint(point.latitude, point.longitude, rotation, 0, VIEW_W, VIEW_H, RADIUS);
    if (!projected.visible) { open = false; continue; }
    segments.push(`${open ? 'L' : 'M'}${projected.x.toFixed(1)},${projected.y.toFixed(1)}`);
    open = true;
  }
  return segments.join(' ');
}

function graticulePath(rotation: number): string {
  const segments: string[] = [];
  for (let longitude = -150; longitude <= 180; longitude += 30) {
    let open = false;
    for (let latitude = -75; latitude <= 75; latitude += 7.5) {
      const p = projectPoint(latitude, longitude, rotation, 0, VIEW_W, VIEW_H, RADIUS);
      if (!p.visible) { open = false; continue; }
      segments.push(`${open ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      open = true;
    }
  }
  for (let latitude = -60; latitude <= 60; latitude += 30) {
    let open = false;
    for (let longitude = -180; longitude <= 180; longitude += 6) {
      const p = projectPoint(latitude, longitude, rotation, 0, VIEW_W, VIEW_H, RADIUS);
      if (!p.visible) { open = false; continue; }
      segments.push(`${open ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      open = true;
    }
  }
  return segments.join(' ');
}

export interface GlobeProps {
  signals: Signal[];
  filter: Filter;
  selectedId: string | null;
  onSelect: (id: string) => void;
  rotateToSignalId?: string | null;
}

export function Globe({ signals, filter, selectedId, onSelect, rotateToSignalId }: GlobeProps): JSX.Element {
  const titleId = useId();
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const drag = useRef<{ x: number; active: boolean } | null>(null);

  const filteredSignals = useMemo(() => signals.filter((signal) => {
    if (filter.type !== 'WORLD' && signal.type !== filter.type) return false;
    if (filter.category && signal.category !== filter.category) return false;
    return true;
  }), [signals, filter]);

  const placedSignals = useMemo(() => separateMarkers(filteredSignals.map((signal, index) => {
    const position = displayPosition(signal, index);
    const projected = projectPoint(position.latitude, position.longitude, rotation, 0, VIEW_W, VIEW_H, RADIUS);
    return {
      signal,
      position,
      x: projected.x,
      y: projected.y,
      visible: projected.visible,
      facing: projected.facing,
      offsetX: 0,
      offsetY: 0,
    };
  })), [filteredSignals, rotation]);

  const globeGrid = useMemo(() => graticulePath(rotation), [rotation]);
  const visibleCount = placedSignals.filter((signal) => signal.visible).length;

  function selectSignal(marker: PlacedSignal) {
    onSelect(marker.signal.id);
    setRotation(wrapLongitude(marker.position.longitude));
  }

  function pointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, active: false };
  }
  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const delta = event.clientX - drag.current.x;
    if (Math.abs(delta) > 2) drag.current.active = true;
    drag.current.x = event.clientX;
    setRotation((value) => wrapLongitude(value + (delta / VIEW_W) * 280));
  }
  function pointerUp(event: PointerEvent<SVGSVGElement>) {
    drag.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* no-op */ }
  }
  function wheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    setZoom((value) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value * (event.deltaY > 0 ? 0.93 : 1.07))));
  }
  function keyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === 'ArrowLeft') { event.preventDefault(); setRotation((value) => wrapLongitude(value - 12)); }
    if (event.key === 'ArrowRight') { event.preventDefault(); setRotation((value) => wrapLongitude(value + 12)); }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); setZoom((value) => Math.min(ZOOM_MAX, value * 1.1)); }
    if (event.key === '-') { event.preventDefault(); setZoom((value) => Math.max(ZOOM_MIN, value * 0.9)); }
  }
  function reset() { setRotation(0); setZoom(1); }

  // Existing store can request that the globe face a selected signal.
  useEffect(() => {
    if (!rotateToSignalId) return;
    const target = signals.find((signal) => signal.id === rotateToSignalId);
    if (!target) return;
    const position = displayPosition(target, signals.indexOf(target));
    setRotation(wrapLongitude(position.longitude));
  }, [rotateToSignalId, signals]);

  return (
    <div className="gp-globe">
      <div className="gp-globe__viewport" role="region" aria-label="Interactive Earth view">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="gp-globe__svg"
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onWheel={wheel}
          onKeyDown={keyDown}
        >
          <title id={titleId}>Earth view. {visibleCount} signals visible. Drag horizontally to rotate and select a marker for details.</title>
          <defs>
            <radialGradient id="earth-ocean" cx="35%" cy="28%" r="75%">
              <stop offset="0%" stopColor="#3a6e9e" />
              <stop offset="55%" stopColor="#163b60" />
              <stop offset="100%" stopColor="#071525" />
            </radialGradient>
            <linearGradient id="earth-land" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#78a58f" />
              <stop offset="100%" stopColor="#315f56" />
            </linearGradient>
            <radialGradient id="earth-limb" cx="50%" cy="50%" r="50%">
              <stop offset="78%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,.6)" />
            </radialGradient>
            <clipPath id="earth-clip"><circle cx={CENTRE_X} cy={CENTRE_Y} r={RADIUS} /></clipPath>
          </defs>
          <g transform={`translate(${CENTRE_X} ${CENTRE_Y}) scale(${zoom}) translate(${-CENTRE_X} ${-CENTRE_Y})`}>
            <circle cx={CENTRE_X} cy={CENTRE_Y} r={RADIUS} fill="url(#earth-ocean)" />
            <g clipPath="url(#earth-clip)">
              <path d={globeGrid} fill="none" stroke="rgba(202,225,247,.12)" strokeWidth=".55" />
              {CONTINENT_OUTLINES.map((outline, index) => (
                <path key={index} d={outlinePath(outline, rotation)} fill="url(#earth-land)" stroke="rgba(202,233,217,.35)" strokeWidth=".7" />
              ))}
              <circle cx={CENTRE_X} cy={CENTRE_Y} r={RADIUS} fill="url(#earth-limb)" pointerEvents="none" />
            </g>
            <circle cx={CENTRE_X} cy={CENTRE_Y} r={RADIUS} fill="none" stroke="rgba(201,229,255,.32)" strokeWidth="1.2" />
            {placedSignals.map((marker) => {
              if (!marker.visible) return null;
              const selected = marker.signal.id === selectedId;
              const hovered = marker.signal.id === hoverId;
              const size = selected ? 8.5 : hovered ? 7 : 5.6;
              const typeClass = marker.signal.type.toLowerCase();
              return (
                <g
                  key={marker.signal.id}
                  className={cx('gp-marker', `gp-marker--${typeClass}`, selected && 'gp-marker--selected')}
                  transform={`translate(${(marker.x + marker.offsetX).toFixed(1)} ${(marker.y + marker.offsetY).toFixed(1)})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${marker.signal.title}. ${isGlobalSignal(marker.signal) ? 'Global signal.' : `${marker.signal.country ?? ''} ${marker.signal.region ?? ''}`}`}
                  onClick={(event) => { event.stopPropagation(); selectSignal(marker); }}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectSignal(marker); } }}
                  onMouseEnter={() => setHoverId(marker.signal.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onFocus={() => setHoverId(marker.signal.id)}
                  onBlur={() => setHoverId(null)}
                >
                  {selected ? <circle r={size + 7} className="gp-marker__pulse" /> : null}
                  <circle r={size} className="gp-marker__core" />
                </g>
              );
            })}
          </g>
        </svg>
        {hoverId ? <div className="gp-globe__tooltip" role="status">{signals.find((signal) => signal.id === hoverId)?.title}</div> : null}
        <div className="gp-globe__controls" aria-label="Earth controls">
          <button type="button" className="gp-globe__control" onClick={() => setZoom((value) => Math.min(ZOOM_MAX, value * 1.12))} aria-label="Zoom in">+</button>
          <button type="button" className="gp-globe__control" onClick={() => setZoom((value) => Math.max(ZOOM_MIN, value * 0.89))} aria-label="Zoom out">−</button>
          <button type="button" className="gp-globe__control" onClick={reset} aria-label="Reset Earth view">↺</button>
        </div>
        <div className="gp-globe__legend" aria-label="Signal type legend">
          <span><i className="gp-dot gp-dot--progress" />Progress</span>
          <span><i className="gp-dot gp-dot--breakthrough" />Breakthrough</span>
          <span><i className="gp-dot gp-dot--needs" />Needs attention</span>
          <span><i className="gp-dot gp-dot--recovery" />Recovery</span>
        </div>
      </div>
      <div className="gp-globe__footer">
        <p className="gp-globe__instructions"><strong>Drag</strong> to rotate · <strong>Scroll</strong> to zoom · <strong>Select</strong> a signal to inspect its evidence</p>
        <p className="gp-globe__scope-note">Global signals use visual anchors for clarity; they are not event-location pins.</p>
      </div>
    </div>
  );
}
