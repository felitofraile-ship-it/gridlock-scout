import type { Project } from "@/lib/projects";

type Coordinate = [number, number]; // longitude, latitude
type XY = { x: number; y: number };
type Closest = { distanceKm: number; first: Coordinate; second: Coordinate };

export type Overlap = Closest & {
  id: string;
  desc: Project;
  gpc: Project;
  tier: "Shared reference" | "Under 1.6 km" | "Under 8 km" | "Under 40 km";
  timing: string;
  locationBasis: "Broad area marker" | "Endpoint marker" | "Straight-line routes";
};

const KM_PER_DEGREE = 111.195;
const COS_LAT = Math.cos(33 * Math.PI / 180);
const toXY = ([lon, lat]: Coordinate): XY => ({ x: lon * KM_PER_DEGREE * COS_LAT, y: lat * KM_PER_DEGREE });
const fromXY = ({ x, y }: XY): Coordinate => [x / (KM_PER_DEGREE * COS_LAT), y / KM_PER_DEGREE];
const distance = (a: XY, b: XY) => Math.hypot(a.x - b.x, a.y - b.y);
const cross = (a: XY, b: XY) => a.x * b.y - a.y * b.x;
const subtract = (a: XY, b: XY): XY => ({ x: a.x - b.x, y: a.y - b.y });

function paths(project: Project): Coordinate[][] {
  if (project.geometry.type === "Point") return [[project.geometry.coordinates]];
  if (project.geometry.type === "LineString") return [project.geometry.coordinates];
  return project.geometry.coordinates;
}

function closestOnSegment(point: XY, start: XY, end: XY): XY {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return { x: start.x + t * dx, y: start.y + t * dy };
}

function segmentIntersection(a: XY, b: XY, c: XY, d: XY): XY | null {
  const r = subtract(b, a);
  const s = subtract(d, c);
  const denominator = cross(r, s);
  if (Math.abs(denominator) < 1e-12) return null;
  const t = cross(subtract(c, a), s) / denominator;
  const u = cross(subtract(c, a), r) / denominator;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + t * r.x, y: a.y + t * r.y };
}

export function closestProjectPoints(first: Project, second: Project): Closest {
  const aPaths = paths(first).map((path) => path.map(toXY));
  const bPaths = paths(second).map((path) => path.map(toXY));
  const a = aPaths.flat();
  const b = bPaths.flat();
  let best = { distanceKm: Infinity, first: a[0], second: b[0] };
  const consider = (x: XY, y: XY) => {
    const km = distance(x, y);
    if (km < best.distanceKm) best = { distanceKm: km, first: x, second: y };
  };

  for (const x of a) for (const y of b) consider(x, y);
  for (const x of a) for (const path of bPaths) for (let i = 0; i < path.length - 1; i++) consider(x, closestOnSegment(x, path[i], path[i + 1]));
  for (const y of b) for (const path of aPaths) for (let i = 0; i < path.length - 1; i++) consider(closestOnSegment(y, path[i], path[i + 1]), y);
  for (const firstPath of aPaths) for (let i = 0; i < firstPath.length - 1; i++) for (const secondPath of bPaths) for (let j = 0; j < secondPath.length - 1; j++) {
    const point = segmentIntersection(firstPath[i], firstPath[i + 1], secondPath[j], secondPath[j + 1]);
    if (point) consider(point, point);
  }
  return { distanceKm: best.distanceKm, first: fromXY(best.first), second: fromXY(best.second) };
}

function timingSignal(a: Project, b: Project): string {
  const first = a.schedule.plannedInService;
  const second = b.schedule.plannedInService;
  if (!first || !second) return "Build-window match unknown";
  const days = Math.round(Math.abs(Date.parse(first) - Date.parse(second)) / 86_400_000);
  if (days <= 365) return `Targets ${days} ${days === 1 ? "day" : "days"} apart; build windows unverified`;
  const years = Math.round(days / 365);
  return `Targets about ${years} ${years === 1 ? "year" : "years"} apart; build windows unverified`;
}

export function findOverlaps(projects: Project[]): Overlap[] {
  const desc = projects.filter((project) => project.utility === "DESC");
  const gpc = projects.filter((project) => project.utility === "GPC");
  const overlaps: Overlap[] = [];
  for (const a of desc) for (const b of gpc) {
    const closest = closestProjectPoints(a, b);
    if (closest.distanceKm >= 40) continue;
    const tier = closest.distanceKm < 0.05 ? "Shared reference" : closest.distanceKm < 1.6 ? "Under 1.6 km" : closest.distanceKm < 8 ? "Under 8 km" : "Under 40 km";
    overlaps.push({
      id: `${a.id}__${b.id}`, desc: a, gpc: b, ...closest, tier,
      timing: timingSignal(a, b),
      locationBasis: a.locationQuality === "regional_marker" || b.locationQuality === "regional_marker" ? "Broad area marker" : a.locationQuality === "endpoint_only" || b.locationQuality === "endpoint_only" ? "Endpoint marker" : "Straight-line routes",
    });
  }
  return overlaps.sort((a, b) => a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));
}
