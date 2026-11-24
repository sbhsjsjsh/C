import { ROOMS, type RoomSpec } from '../data/propertyData';

export type RouteKind = 'overview' | 'floorplan' | 'rooms' | 'room-detail' | 'sunlight' | 'specs';

export interface ParsedRoute {
  kind: RouteKind;
  path: string;
  room?: RoomSpec;
}

export interface SiteRouteItem {
  path: string;
  label: string;
  description: string;
}

export const ALL_SITE_ROUTES: SiteRouteItem[] = [
  { path: '/', label: '3D Overview', description: 'Full interactive 360° exterior & estate view' },
  { path: '/floorplan', label: 'Cutaway Floorplan', description: 'Dollhouse floorplan cutaway & exploded levels' },
  { path: '/rooms', label: 'Guided Room Tour', description: 'Interactive room-by-room walkthrough' },
  ...ROOMS.map((r) => ({
    path: `/rooms/${r.slug}`,
    label: r.name,
    description: `${r.floor} · ${r.areaSqFt} sq ft interactive view`,
  })),
  { path: '/sunlight', label: 'Sunlight & Orientation', description: 'Live sunrise-to-evening shadow & lighting study' },
  { path: '/specs', label: 'Specs & Mortgage', description: 'Room dimensions table, architectural specs & mortgage calculator' },
];

export function parseRoute(pathname: string): ParsedRoute {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/overview') {
    return { kind: 'overview', path: '/' };
  }
  if (clean === '/floorplan') {
    return { kind: 'floorplan', path: '/floorplan' };
  }
  if (clean === '/rooms') {
    return { kind: 'rooms', path: '/rooms', room: ROOMS[0] };
  }
  if (clean.startsWith('/rooms/')) {
    const slug = clean.slice('/rooms/'.length);
    const matched = ROOMS.find((r) => r.slug === slug);
    if (matched) {
      return { kind: 'room-detail', path: `/rooms/${matched.slug}`, room: matched };
    }
    return { kind: 'rooms', path: '/rooms', room: ROOMS[0] };
  }
  if (clean === '/sunlight') {
    return { kind: 'sunlight', path: '/sunlight' };
  }
  if (clean === '/specs') {
    return { kind: 'specs', path: '/specs' };
  }
  return { kind: 'overview', path: '/' };
}

export function getCurrentRoutePath(): string {
  // Support hash fallback if present, otherwise standard History pathname
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    return window.location.hash.slice(1);
  }
  return window.location.pathname || '/';
}

export function navigateToPath(path: string, replace = false): void {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  try {
    if (replace) {
      window.history.replaceState({}, '', normalized);
    } else if (window.location.pathname !== normalized) {
      window.history.pushState({}, '', normalized);
    }
  } catch {
    // Graceful fallback if embedded in restricted iframe origin
    window.location.hash = `#${normalized}`;
  }
}
