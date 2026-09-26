import projectData from "@/data/projects.json";

export type Utility = "DESC" | "GPC";
export type LocationQuality = "endpoint_only" | "straight_line_approximation" | "regional_marker" | "published_preliminary_route";

export type Project = {
  id: string;
  utility: Utility;
  state: "SC" | "GA";
  name: string;
  description: string;
  geometry: { type: "Point"; coordinates: [number, number] } | { type: "LineString"; coordinates: [number, number][] } | { type: "MultiLineString"; coordinates: [number, number][][] };
  locationQuality: LocationQuality;
  locationNote: string;
  endpoints: { name: string; coordinates: [number, number] }[];
  schedule: { constructionStart: string | null; constructionStartLabel?: string | null; plannedInService: string | null; note: string };
  source: { title: string; url: string | null; reference: string };
  sourceChecked: string;
};

export const projects = projectData as Project[];

export function isPastTarget(project: Project, today = new Date()): boolean {
  const year = project.schedule.constructionStartLabel?.match(/\d{4}/)?.[0];
  const season = project.schedule.constructionStartLabel?.split(" ")[0];
  const seasonalEnd = year && season ? `${year}-${{ Spring: "05-31", Summer: "08-31", Fall: "11-30", Winter: "12-31" }[season as "Spring" | "Summer" | "Fall" | "Winter"] ?? "12-31"}` : null;
  const target = project.schedule.plannedInService ?? seasonalEnd ?? project.schedule.constructionStart;
  return Boolean(target && target < today.toISOString().slice(0, 10));
}

export function formatProjectDate(value: string | null): string {
  if (!value) return "Not published";
  const date = value.length === 7 ? `${value}-01` : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    ...(value.length === 10 ? { day: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
