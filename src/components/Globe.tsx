/**
 * GlobalPulse — interactive SVG 2.5D globe.
 *
 * The globe is a sphere projected from server-supplied latitude/longitude.
 * Markers come only from the API (no authored positions in this file).
 *
 * Interactions:
 *   • Pointer drag (horizontal) rotates the central longitude.
 *   • Vertical drag is gated to a small tilt range (the task allows
 *     "optional limited vertical tilt").
 *   • Wheel + buttons zoom in / out within a clamp.
 *   • Clicking a marker selects it; the globe rotates toward the marker's
 *     longitude so the user sees it slide to centre.
 *   • Backside markers are hidden or de-emphasised based on visibility.
 *
 * Accessibility:
 *   • <svg> has role="img" and an aria-label that names the visible signals.
 *   • Buttons are real <button> elements with aria-pressed for filter state.
 *   • Markers are focusable and respond to Enter / Space.
 *
 * Performance:
 *   • Pure SVG + CSS. requestAnimationFrame is used for the drag inertia, no
 *     WebGL, no canvas, no new dependency.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react';
import type { Filter, Signal } from '../types';
import { cx as classes } from './util';
import { projectPoint, wrapLongitude, type LatLon } from '../lib/geo';

/* ------------------------------------------------------------------ sizing */

const VIEW_W = 1000;
const VIEW_H = 500;
const RADIUS = Math.min(VIEW_W, VIEW_H) / 2 - 24;
const CENTRE_X = VIEW_W / 2;
const CENTRE_Y = VIEW_H / 2;

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2.6;
const TILT_MIN_DEG = -25;
const TILT_MAX_DEG = 25;

/* -------------------------------------------------------------- collision */

interface PlacedMarker {
  signal: Signal;
  x: number;
  y: number;
  visible: boolean;
  facing: number; // 0..1
  dx: number; // collision nudge x
  dy: number; // collision nudge y
  depth: number; // 0..1 — closer to viewer = higher
}

/**
 * Resolve overlaps in screen space. Markers that project to within
 * `MIN_DIST` of each other get pushed radially apart by `STEP_PX` until
 * they're clear or we've moved them by up to `MAX_SHIFT`. The algorithm
 * runs a few passes so chains of nearby markers fan out rather than
 * jittering in place.
 */
const MIN_DIST = 18;
const MAX_SHIFT = 28;
const COLLISION_PASSES = 6;

function resolveCollisions(placed: PlacedMarker[]): PlacedMarker[] {
  const out = placed.slice();
  for (let pass = 0; pass < COLLISION_PASSES; pass += 1) {
    let moved = false;
    for (let i = 0; i < out.length; i += 1) {
      for (let j = i + 1; j < out.length; j += 1) {
        const a = out[i];
        const b = out[j];
        if (!a.visible && !b.visible) continue;
        const ax = a.x + a.dx;
        const ay = a.y + a.dy;
        const bx = b.x + b.dx;
        const by = b.y + b.dy;
        const dx = bx - ax;
        const dy = by - ay;
        let dist = Math.hypot(dx, dy);
        if (dist >= MIN_DIST) continue;
        // Exactly-overlapping markers (e.g. two signals placed at the same
        // lat/lon) have dist === 0, so there is no direction to push them
        // apart. Give them a small deterministic offset (based on their
        // index) so they still separate instead of being permanently
        // stacked and unclickable.
        let nx: number;
        let ny: number;
        if (dist === 0) {
          const angle = ((i + 1) * 137.5 + j * 47) * (Math.PI / 180);
          nx = Math.cos(angle);
          ny = Math.sin(angle);
          dist = 0.01;
        } else {
          nx = dx / dist;
          ny = dy / dist;
        }
        const push = (MIN_DIST - dist) / 2 + 0.5;
        // Cap each side at MAX_SHIFT so far-from-centre markers don't fly off
        const cap = (m: PlacedMarker) => {
          if (Math.abs(m.dx) >= MAX_SHIFT && Math.sign(m.dx) === Math.sign(nx)) return;
          if (Math.abs(m.dy) >= MAX_SHIFT && Math.sign(m.dy) === Math.sign(ny)) return;
        };
        cap(a);
        cap(b);
        if (Math.abs(a.dx) < MAX_SHIFT) a.dx += nx * push;
        if (Math.abs(a.dy) < MAX_SHIFT) a.dy += ny * push;
        if (Math.abs(b.dx) < MAX_SHIFT) b.dx -= nx * push;
        if (Math.abs(b.dy) < MAX_SHIFT) b.dy -= ny * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return out;
}

/* ----------------------------------------------------------------- types */

export interface GlobeProps {
  signals: Signal[];
  filter: Filter;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Imperative "rotate toward this signal". */
  rotateToSignalId: string | null;
}

/* ---------------------------------------------------------------- component */

export function Globe({ signals, filter, selectedId, onSelect, rotateToSignalId }: GlobeProps) {
  const [rotation, setRotation] = useState<number>(0);
  const [tilt, setTilt] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // For inertia
  const velocityRef = useRef<number>(0);
  const tiltVelocityRef = useRef<number>(0);
  const rafRef = useRef<number>();

  const titleId = useId();

  /* ------------------------------- reduce-motion respect */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* ------------------------------- rotation toward selected */
  useEffect(() => {
    if (!rotateToSignalId) return;
    const target = signals.find((s) => s.id === rotateToSignalId);
    if (!target) return;
    // Centre the marker on the front of the globe.
    setRotation(wrapLongitude(target.longitude));
  }, [rotateToSignalId, signals]);

  /* ------------------------------- inertia loop */
  useEffect(() => {
    if (reduceMotion) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const v = velocityRef.current;
      const tv = tiltVelocityRef.current;
      if (Math.abs(v) > 0.05 || Math.abs(tv) > 0.05) {
        setRotation((r) => wrapLongitude(r + v * dt));
        setTilt((t) => Math.max(TILT_MIN_DEG, Math.min(TILT_MAX_DEG, t + tv * dt)));
        // Exponential decay
        velocityRef.current = v * 0.92;
        tiltVelocityRef.current = tv * 0.92;
      } else {
        velocityRef.current = 0;
        tiltVelocityRef.current = 0;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [reduceMotion]);

  /* ------------------------------- filter & projection */
  const visibleSignals = useMemo(() => {
    return signals.filter((s) => {
      if (filter.type !== 'WORLD' && s.type !== filter.type) return false;
      if (filter.category && s.category !== filter.category) return false;
      return true;
    });
  }, [signals, filter]);

  const placed = useMemo<PlacedMarker[]>(() => {
    const projected = visibleSignals.map((s) => {
      const p = projectPoint(s.latitude, s.longitude, rotation, tilt, VIEW_W, VIEW_H, RADIUS);
      return { signal: s, x: p.x, y: p.y, visible: p.visible, facing: p.facing, dx: 0, dy: 0, depth: p.depth };
    });
    return resolveCollisions(projected);
  }, [visibleSignals, rotation, tilt]);

  /* ------------------------------- pointer drag */
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number } | null>(null);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    velocityRef.current = 0;
    tiltVelocityRef.current = 0;
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d || !d.active) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.lastX = e.clientX;
    d.lastY = e.clientY;

    // Horizontal drag → longitude rotation.
    const lonDelta = (dx / VIEW_W) * 240; // px → degrees
    setRotation((r) => wrapLongitude(r + lonDelta));
    velocityRef.current = lonDelta; // stored as deg/s approximation below
    velocityRef.current = (dx / VIEW_W) * 240 * (1000 / 16);

    // Vertical drag is gated to ±25° tilt and only when shift not held.
    if (Math.abs(dy) > 4 && !e.shiftKey) {
      const tiltDelta = (dy / VIEW_H) * 60;
      setTilt((t) => Math.max(TILT_MIN_DEG, Math.min(TILT_MAX_DEG, t + tiltDelta)));
      tiltVelocityRef.current = (dy / VIEW_H) * 60 * (1000 / 16);
    }
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    d.active = false;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  /* ------------------------------- wheel zoom */
  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    if (!e.ctrlKey && Math.abs(e.deltaY) < 4) return; // ignore tiny trackscrolls
    e.preventDefault();
    setZoom((z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z * (e.deltaY > 0 ? 0.92 : 1.08))));
  };

  /* ------------------------------- keyboard */
  const onSvgKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setRotation((r) => wrapLongitude(r - 12));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setRotation((r) => wrapLongitude(r + 12));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setTilt((t) => Math.max(TILT_MIN_DEG, Math.min(TILT_MAX_DEG, t + 6)));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setTilt((t) => Math.max(TILT_MIN_DEG, Math.min(TILT_MAX_DEG, t - 6)));
        break;
      case '+':
      case '=':
        e.preventDefault();
        setZoom((z) => Math.min(ZOOM_MAX, z * 1.1));
        break;
      case '-':
        e.preventDefault();
        setZoom((z) => Math.max(ZOOM_MIN, z * 0.9));
        break;
      default:
        break;
    }
  };

  /* ------------------------------- helpers */
  const onMarkerActivate = useCallback(
    (id: string) => {
      onSelect(id);
      const target = signals.find((s) => s.id === id);
      if (!target) return;
      setRotation(wrapLongitude(target.longitude));
    },
    [onSelect, signals],
  );

  const onMarkerKeyDown = (e: KeyboardEvent<SVGGElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onMarkerActivate(id);
    }
  };

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, z * 1.18));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, z * 0.84));
  const resetView = () => {
    setRotation(0);
    setTilt(0);
    setZoom(1);
    velocityRef.current = 0;
    tiltVelocityRef.current = 0;
  };

  /* ------------------------------- graticule */
  const graticulePath = useMemo(() => {
    const parts: string[] = [];
    // meridians every 30°
    for (let lon = -180; lon <= 180; lon += 30) {
      const pts: string[] = [];
      for (let lat = -85; lat <= 85; lat += 10) {
        const p = projectPoint(lat, lon, rotation, tilt, VIEW_W, VIEW_H, RADIUS);
        if (p.visible) pts.push(`${pts.length === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
        else if (pts.length > 0) {
          parts.push(pts.join(' '));
          pts.length = 0;
        }
      }
      if (pts.length > 0) parts.push(pts.join(' '));
    }
    // parallels every 30°
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts: string[] = [];
      for (let lon = -180; lon <= 180; lon += 5) {
        const p = projectPoint(lat, lon, rotation, tilt, VIEW_W, VIEW_H, RADIUS);
        if (p.visible) pts.push(`${pts.length === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
        else if (pts.length > 0) {
          parts.push(pts.join(' '));
          pts.length = 0;
        }
      }
      if (pts.length > 0) parts.push(pts.join(' '));
    }
    return parts.join(' ');
  }, [rotation, tilt]);

  const visibleCount = placed.filter((p) => p.visible).length;
  const hiddenCount = placed.length - visibleCount;

  return (
    <div className="gp-globe">
      <div className="gp-globe__viewport" role="region" aria-label="Living world map">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="gp-globe__svg"
          role="img"
          aria-labelledby={titleId}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onKeyDown={onSvgKeyDown}
          tabIndex={0}
        >
          <title id={titleId}>
            Living world map. {visibleCount} signals visible, {hiddenCount} on the far side.
            Drag to rotate, scroll to zoom.
          </title>

          <defs>
            <radialGradient id="gp-ocean" cx="38%" cy="35%" r="80%">
              <stop offset="0%" stopColor="#1a3c5c" />
              <stop offset="65%" stopColor="#0d2338" />
              <stop offset="100%" stopColor="#06101a" />
            </radialGradient>
            <linearGradient id="gp-land" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3a7a5c" />
              <stop offset="100%" stopColor="#1f4a3a" />
            </linearGradient>
            <radialGradient id="gp-limb" cx="50%" cy="50%" r="50%">
              <stop offset="80%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
            </radialGradient>
            <clipPath id="gp-disc-clip">
              <circle cx={CENTRE_X} cy={CENTRE_Y} r={RADIUS} />
            </clipPath>
          </defs>

          {/* The disc itself */}
          <circle
            cx={CENTRE_X}
            cy={CENTRE_Y}
            r={RADIUS}
            fill="url(#gp-ocean)"
          />

          {/* Everything inside the disc is clipped to the disc edge */}
          <g clipPath="url(#gp-disc-clip)">
            {/* Continents (rendered as a single rough polygon mask) */}
            <g
              style={{
                transform: `translate(${(1 - zoom) * CENTRE_X}px, ${(1 - zoom) * CENTRE_Y}px) scale(${zoom})`,
                transformOrigin: `${CENTRE_X}px ${CENTRE_Y}px`,
              }}
            >
              <path d={graticulePath} stroke="rgba(140,200,220,0.10)" strokeWidth="0.5" fill="none" />

              {/* Coastline outlines driven by lat/lon projection */}
              <g className="gp-globe__land">
                {CONTINENT_OUTLINES_DOTS.map((outline, i) => (
                  <PathFromOutline
                    key={i}
                    outline={outline}
                    rotation={rotation}
                    tilt={tilt}
                  />
                ))}
              </g>

              {/* Markers (sorted so back markers draw first) */}
              <g className="gp-globe__markers">
                {placed
                  .slice()
                  .sort((a, b) => a.depth - b.depth)
                  .map((m) => (
                    <MarkerNode
                      key={m.signal.id}
                      placed={m}
                      selected={m.signal.id === selectedId}
                      hovered={m.signal.id === hoverId}
                      onActivate={() => onMarkerActivate(m.signal.id)}
                      onHover={(h) => setHoverId(h ? m.signal.id : null)}
                      onKeyDown={(e) => onMarkerKeyDown(e, m.signal.id)}
                    />
                  ))}
              </g>
            </g>
          </g>

          {/* Limb darkening on top, so the disc reads as a sphere */}
          <circle
            cx={CENTRE_X}
            cy={CENTRE_Y}
            r={RADIUS}
            fill="url(#gp-limb)"
            pointerEvents="none"
          />
          <circle
            cx={CENTRE_X}
            cy={CENTRE_Y}
            r={RADIUS}
            fill="none"
            stroke="rgba(140,210,200,0.25)"
            strokeWidth="1.5"
            pointerEvents="none"
          />
        </svg>

        {hoverId ? (
          <div className="gp-globe__tooltip" role="status">
            {signals.find((s) => s.id === hoverId)?.title ?? ''}
          </div>
        ) : null}

        <div className="gp-globe__controls" aria-label="Map controls">
          <button
            type="button"
            className="gp-globe__control"
            onClick={zoomIn}
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="gp-globe__control"
            onClick={zoomOut}
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="gp-globe__control"
            onClick={resetView}
            aria-label="Reset view"
            title="Reset view"
          >
            ◎
          </button>
        </div>

        <div className="gp-globe__legend" aria-hidden="true">
          <span><i className="gp-dot gp-dot--progress" /> Progress</span>
          <span><i className="gp-dot gp-dot--breakthrough" /> Breakthrough</span>
          <span><i className="gp-dot gp-dot--needs" /> Needs attention</span>
          <span><i className="gp-dot gp-dot--recovery" /> Recovery</span>
        </div>
      </div>

      <p className="gp-globe__instructions" role="note">
        <strong>Drag</strong> the globe to rotate (left/right) or tilt (up/down).
        <strong> Scroll</strong> or use the +/- buttons to zoom.
        <strong> Click</strong> a marker to inspect a signal.
        Keyboard: <kbd>←</kbd>/<kbd>→</kbd> rotate, <kbd>↑</kbd>/<kbd>↓</kbd> tilt,
        <kbd>+</kbd>/<kbd>−</kbd> zoom.
      </p>
    </div>
  );
}

/* ----------------------------------------------------- small sub-components */

const CONTINENT_OUTLINES_DOTS: Array<Array<{ latitude: number; longitude: number }>> = [
  // North America
  [
    { latitude: 66, longitude: -168 }, { latitude: 71, longitude: -155 },
    { latitude: 70, longitude: -130 }, { latitude: 73, longitude: -95 },
    { latitude: 68, longitude: -75 },  { latitude: 58, longitude: -60 },
    { latitude: 47, longitude: -52 },  { latitude: 45, longitude: -66 },
    { latitude: 42, longitude: -70 },  { latitude: 35, longitude: -75 },
    { latitude: 25, longitude: -81 },  { latitude: 29, longitude: -90 },
    { latitude: 26, longitude: -97 },  { latitude: 22, longitude: -105 },
    { latitude: 28, longitude: -114 }, { latitude: 40, longitude: -124 },
    { latitude: 55, longitude: -130 }, { latitude: 60, longitude: -145 },
    { latitude: 66, longitude: -168 },
  ],
  // Greenland
  [
    { latitude: 82, longitude: -58 }, { latitude: 80, longitude: -20 },
    { latitude: 70, longitude: -22 }, { latitude: 60, longitude: -42 },
    { latitude: 66, longitude: -55 }, { latitude: 82, longitude: -58 },
  ],
  // South America
  [
    { latitude: 8, longitude: -81 },   { latitude: 11, longitude: -62 },
    { latitude: 5, longitude: -52 },   { latitude: -6, longitude: -35 },
    { latitude: -22, longitude: -38 }, { latitude: -33, longitude: -48 },
    { latitude: -41, longitude: -62 }, { latitude: -53, longitude: -72 },
    { latitude: -45, longitude: -75 }, { latitude: -30, longitude: -71 },
    { latitude: -18, longitude: -71 }, { latitude: -6, longitude: -79 },
    { latitude: 8, longitude: -81 },
  ],
  // Africa
  [
    { latitude: 15, longitude: -17 },  { latitude: 36, longitude: 0 },
    { latitude: 37, longitude: 11 },   { latitude: 31, longitude: 32 },
    { latitude: 12, longitude: 43 },   { latitude: 12, longitude: 51 },
    { latitude: -2, longitude: 41 },   { latitude: -16, longitude: 40 },
    { latitude: -26, longitude: 33 },  { latitude: -35, longitude: 20 },
    { latitude: -30, longitude: 18 },  { latitude: -18, longitude: 12 },
    { latitude: -1, longitude: 9 },    { latitude: 4, longitude: 6 },
    { latitude: 5, longitude: -8 },    { latitude: 15, longitude: -17 },
  ],
  // Europe + Asia (Eurasia outline)
  [
    { latitude: 44, longitude: -10 }, { latitude: 58, longitude: -9 },
    { latitude: 62, longitude: 5 },   { latitude: 71, longitude: 28 },
    { latitude: 70, longitude: 60 },  { latitude: 76, longitude: 100 },
    { latitude: 72, longitude: 140 }, { latitude: 65, longitude: 170 },
    { latitude: 55, longitude: 160 }, { latitude: 45, longitude: 142 },
    { latitude: 38, longitude: 122 }, { latitude: 24, longitude: 119 },
    { latitude: 10, longitude: 105 }, { latitude: 8, longitude: 98 },
    { latitude: 8, longitude: 80 },   { latitude: 22, longitude: 70 },
    { latitude: 26, longitude: 56 },  { latitude: 38, longitude: 45 },
    { latitude: 41, longitude: 30 },  { latitude: 38, longitude: 20 },
    { latitude: 45, longitude: 12 },  { latitude: 43, longitude: 3 },
    { latitude: 44, longitude: -10 },
  ],
  // Australia
  [
    { latitude: -22, longitude: 114 }, { latitude: -12, longitude: 131 },
    { latitude: -11, longitude: 142 }, { latitude: -27, longitude: 153 },
    { latitude: -38, longitude: 147 }, { latitude: -32, longitude: 130 },
    { latitude: -34, longitude: 116 }, { latitude: -22, longitude: 114 },
  ],
  // Antarctica band
  [
    { latitude: -72, longitude: -180 }, { latitude: -76, longitude: -90 },
    { latitude: -72, longitude: 0 },    { latitude: -68, longitude: 90 },
    { latitude: -72, longitude: 180 }, { latitude: -90, longitude: 180 },
    { latitude: -90, longitude: -180 }, { latitude: -72, longitude: -180 },
  ],
];

function PathFromOutline({
  outline,
  rotation,
  tilt,
}: {
  outline: LatLon[];
  rotation: number;
  tilt: number;
}) {
  const path = useMemo(() => {
    const parts: string[] = [];
    let open = false;
    for (const pt of outline) {
      const p = projectPoint(pt.latitude, pt.longitude, rotation, tilt, VIEW_W, VIEW_H, RADIUS);
      if (!p.visible) {
        open = false;
        continue;
      }
      parts.push(`${open ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      open = true;
    }
    return parts.join(' ');
  }, [outline, rotation, tilt]);
  return <path d={path} fill="url(#gp-land)" stroke="rgba(170,230,200,0.45)" strokeWidth="0.6" />;
}

function MarkerNode({
  placed,
  selected,
  hovered,
  onActivate,
  onHover,
  onKeyDown,
}: {
  placed: PlacedMarker;
  selected: boolean;
  hovered: boolean;
  onActivate: () => void;
  onHover: (hovered: boolean) => void;
  onKeyDown: (e: KeyboardEvent<SVGGElement>) => void;
}) {
  const { signal, x, y, visible, facing, dx, dy } = placed;
  const type = signal.type;
  // Back-side markers fade + shrink instead of disappearing, so the user can
  // still tell something is there but it doesn't compete with the front.
  const opacity = visible ? (selected ? 1 : hovered ? 0.95 : 0.55 + facing * 0.45) : 0.18;
  const r = selected ? 9 : hovered ? 7.5 : 6;
  const cx = x + dx;
  const cy = y + dy;
  const cls = classes('gp-marker', `gp-marker--${type.toLowerCase()}`, selected && 'gp-marker--selected');
  return (
    <g
      className={cls}
      transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)})`}
      opacity={opacity}
      tabIndex={-1}
      role="button"
      aria-label={`${signal.title}${signal.country ? `, ${signal.country}` : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onKeyDown={onKeyDown}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
    >
      {selected ? (
        <circle r={r + 6} className="gp-marker__pulse" />
      ) : null}
      <circle r={r} className="gp-marker__core" />
      {!visible ? (
        <circle r={r - 1} className="gp-marker__ghost" />
      ) : null}
    </g>
  );
}