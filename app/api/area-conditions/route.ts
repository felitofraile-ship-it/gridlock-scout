type Coordinate = [number, number]; // longitude, latitude
type Alert = { event: string; headline: string; url: string };
type FireEvent = { title: string; distanceKm: number; url: string; reportedAt: string };

const CANOPY_WMS = "https://dmsdata.cr.usgs.gov/geoserver/mrlc_NLCD-Tree-Canopy-Native_conus_year_data/wms";

function validPoint([lon, lat]: Coordinate): boolean {
  return Number.isFinite(lon) && Number.isFinite(lat) && lon >= -86 && lon <= -78 && lat >= 30 && lat <= 36;
}

async function getJson(url: string, headers?: HeadersInit): Promise<unknown> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(9_000), cache: "no-store" });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return response.json();
}

async function canopyAt([lon, lat]: Coordinate): Promise<number> {
  const url = new URL(CANOPY_WMS);
  const args = {
    service: "WMS", version: "1.1.1", request: "GetFeatureInfo",
    layers: "NLCD-Tree-Canopy-Native_conus_year_data",
    query_layers: "NLCD-Tree-Canopy-Native_conus_year_data",
    styles: "", bbox: `${lon - 0.005},${lat - 0.005},${lon + 0.005},${lat + 0.005}`,
    srs: "EPSG:4326", width: "101", height: "101", x: "50", y: "50",
    format: "image/png", info_format: "application/json", time: "2025-01-01",
  };
  for (const [key, value] of Object.entries(args)) url.searchParams.set(key, value);
  const body = await getJson(url.toString()) as { features?: Array<{ properties?: { PALETTE_INDEX?: number } }> };
  const value = Number(body.features?.[0]?.properties?.PALETTE_INDEX);
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error("Canopy sample unavailable");
  return value;
}

async function elevationAt([lon, lat]: Coordinate): Promise<number> {
  const url = new URL("https://epqs.nationalmap.gov/v1/json");
  url.searchParams.set("x", lon.toFixed(5));
  url.searchParams.set("y", lat.toFixed(5));
  url.searchParams.set("wkid", "4326");
  url.searchParams.set("units", "Meters");
  url.searchParams.set("includeDate", "false");
  const body = await getJson(url.toString()) as { value?: string | number };
  const value = Number(body.value);
  if (!Number.isFinite(value) || value < -100 || value > 5000) throw new Error("Elevation sample unavailable");
  return value;
}

async function activeAlerts([lon, lat]: Coordinate): Promise<Alert[]> {
  const url = new URL("https://api.weather.gov/alerts/active");
  url.searchParams.set("point", `${lat.toFixed(4)},${lon.toFixed(4)}`);
  const body = await getJson(url.toString(), { "User-Agent": "GridlockScout (public grid planning demo)", Accept: "application/geo+json" }) as {
    features?: Array<{ id?: string; properties?: { event?: string; headline?: string } }>;
  };
  if (!Array.isArray(body.features)) throw new Error("Alerts unavailable");
  return body.features.slice(0, 4).map((feature) => ({
    event: feature.properties?.event ?? "Weather alert",
    headline: feature.properties?.headline ?? "Active NWS alert",
    url: feature.id ?? "https://www.weather.gov/alerts",
  }));
}

function distanceKm([firstLon, firstLat]: Coordinate, [secondLon, secondLat]: Coordinate): number {
  const radians = Math.PI / 180;
  const dLat = (secondLat - firstLat) * radians;
  const dLon = (secondLon - firstLon) * radians;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(firstLat * radians) * Math.cos(secondLat * radians) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

async function nearbyFireEvents(first: Coordinate, second: Coordinate): Promise<FireEvent[]> {
  const url = new URL("https://eonet.gsfc.nasa.gov/api/v3/events");
  url.searchParams.set("category", "wildfires");
  url.searchParams.set("status", "open");
  url.searchParams.set("days", "14");
  url.searchParams.set("bbox", `${Math.min(first[0], second[0]) - 0.5},${Math.max(first[1], second[1]) + 0.5},${Math.max(first[0], second[0]) + 0.5},${Math.min(first[1], second[1]) - 0.5}`);
  const body = await getJson(url.toString()) as { events?: Array<{ title?: string; link?: string; geometry?: Array<{ date?: string; type?: string; coordinates?: unknown }> }> };
  if (!Array.isArray(body.events)) throw new Error("Wildfire feed unavailable");
  const matches: FireEvent[] = [];
  const cutoff = Date.now() - 14 * 86_400_000;
  for (const event of body.events) {
    const recentPoints = (event.geometry ?? [])
      .filter((item) => item.type === "Point" && item.date && Date.parse(item.date) >= cutoff && Array.isArray(item.coordinates) && item.coordinates.length >= 2);
    const distances = recentPoints
      .map((item) => {
        const pair = item.coordinates as number[];
        const point: Coordinate = [Number(pair[0]), Number(pair[1])];
        return Math.min(distanceKm(point, first), distanceKm(point, second));
      })
      .filter(Number.isFinite);
    if (!distances.length) continue;
    const nearest = Math.min(...distances);
    const reportedAt = recentPoints.map((item) => item.date!).sort().at(-1)!;
    if (nearest <= 50) matches.push({ title: event.title ?? "Reported fire event", distanceKm: nearest, url: event.link ?? "https://eonet.gsfc.nasa.gov/", reportedAt });
  }
  return matches.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const first: Coordinate = [Number(params.get("aLon")), Number(params.get("aLat"))];
  const second: Coordinate = [Number(params.get("bLon")), Number(params.get("bLat"))];
  if (!validPoint(first) || !validPoint(second)) {
    return Response.json({ error: "Points must be within the Georgia–South Carolina study area." }, { status: 400 });
  }

  const samples: Coordinate[] = [first, [first[0], first[1] + 0.005], [first[0], first[1] - 0.005], second, [second[0], second[1] + 0.005], [second[0], second[1] - 0.005]];
  const uniqueSamples = [...new Map(samples.map((point) => [point.map((value) => value.toFixed(4)).join(","), point])).values()];
  const midpoint: Coordinate = [(first[0] + second[0]) / 2, (first[1] + second[1]) / 2];
  const [canopyResults, elevationResults, alertsResult, wildfireResult] = await Promise.all([
    Promise.allSettled(uniqueSamples.map(canopyAt)),
    Promise.allSettled([elevationAt(first), elevationAt(second)]),
    activeAlerts(midpoint).then((value) => ({ value })).catch(() => ({ value: null })),
    nearbyFireEvents(first, second).then((value) => ({ value })).catch(() => ({ value: null })),
  ]);
  const canopy = canopyResults.filter((result): result is PromiseFulfilledResult<number> => result.status === "fulfilled").map((result) => result.value);
  const elevations = elevationResults.filter((result): result is PromiseFulfilledResult<number> => result.status === "fulfilled").map((result) => result.value);
  return Response.json({
    checkedAt: new Date().toISOString(),
    canopy: canopy.length ? { sampleCount: canopy.length, denseCount: canopy.filter((value) => value >= 60).length, highestPercent: Math.max(...canopy) } : null,
    elevations: elevations.length ? elevations.map((value) => Math.round(value)) : null,
    alerts: alertsResult.value,
    wildfires: wildfireResult.value,
  }, { headers: { "Cache-Control": "no-store" } });
}
