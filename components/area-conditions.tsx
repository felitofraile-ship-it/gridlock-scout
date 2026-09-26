"use client";

import { useEffect, useState } from "react";
import type { Overlap } from "@/lib/overlaps";

type AreaData = {
  checkedAt: string;
  canopy: { sampleCount: number; denseCount: number; highestPercent: number } | null;
  elevations: number[] | null;
  alerts: Array<{ event: string; headline: string; url: string }> | null;
  wildfires: Array<{ title: string; distanceKm: number; url: string; reportedAt: string }> | null;
};

export default function AreaConditions({ overlap }: { overlap: Overlap }) {
  const [data, setData] = useState<AreaData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setData(null);
    const url = new URL("/api/area-conditions", window.location.origin);
    url.searchParams.set("aLon", overlap.first[0].toFixed(5));
    url.searchParams.set("aLat", overlap.first[1].toFixed(5));
    url.searchParams.set("bLon", overlap.second[0].toFixed(5));
    url.searchParams.set("bLat", overlap.second[1].toFixed(5));
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Area sources unavailable");
        return response.json() as Promise<AreaData>;
      })
      .then((result) => { setData(result); setState("ready"); })
      .catch((error) => { if (error.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, [overlap.id, overlap.first, overlap.second, refresh]);

  return <section className="area-conditions" aria-label="Area terrain and environmental conditions">
    <div className="area-heading"><h4>Area conditions to check</h4><button type="button" onClick={() => setRefresh((value) => value + 1)}>Refresh</button></div>
    {state === "loading" && <p role="status">Checking public terrain and hazard feeds…</p>}
    {state === "error" && <p role="alert">Area feeds are unavailable right now. Try refreshing.</p>}
    {state === "ready" && data && <div className="area-textbox">
      <p><strong>Tree cover:</strong> {data.canopy
        ? data.canopy.denseCount
          ? `${data.canopy.denseCount} of ${data.canopy.sampleCount} sampled points have at least 60% canopy in the 2025 map. Plan to verify vegetation clearing and equipment access.`
          : `No dense canopy at ${data.canopy.sampleCount} sampled points (highest ${data.canopy.highestPercent}%). The actual routes may differ.`
        : "Tree-canopy samples unavailable."}</p>
      <p><strong>Elevation:</strong> {data.elevations?.length === 2
        ? `${data.elevations[0]} m and ${data.elevations[1]} m at the two mapped points. Survey the actual route for slope, drainage, and ground access.`
        : data.elevations?.length === 1 ? `${data.elevations[0]} m at one mapped point; route grade is unknown.` : "Elevation samples unavailable."}</p>
      <p><strong>Active alerts:</strong> {data.alerts === null ? "NWS alert feed unavailable." : data.alerts.length ? data.alerts.map((alert, index) => <span key={alert.url}>{index ? "; " : ""}<a href={alert.url} target="_blank" rel="noopener noreferrer">{alert.event}</a></span>) : "No active NWS alert at the midpoint."}</p>
      <p><strong>Fire events:</strong> {data.wildfires === null ? "NASA event feed unavailable." : data.wildfires.length ? data.wildfires.map((fire, index) => <span key={fire.url}>{index ? "; " : ""}<a href={fire.url} target="_blank" rel="noopener noreferrer">{fire.title}</a> ({fire.distanceKm.toFixed(0)} km away; reported {new Date(fire.reportedAt).toLocaleDateString("en-US")})</span>) : "No nearby open NASA EONET fire event reported in the last 14 days."}</p>
    </div>}
    <small>Screening at approximate mapped points. The 2025 canopy map cannot identify old trees or conditions across an entire route. Check field surveys before construction.</small>
    <div className="area-sources">Sources: <a href="https://www.mrlc.gov/data-services-page" target="_blank" rel="noopener noreferrer">MRLC canopy</a> · <a href="https://apps.nationalmap.gov/epqs/" target="_blank" rel="noopener noreferrer">USGS elevation</a> · <a href="https://www.weather.gov/documentation/services-web-alerts" target="_blank" rel="noopener noreferrer">NWS alerts</a> · <a href="https://eonet.gsfc.nasa.gov/docs/v3" target="_blank" rel="noopener noreferrer">NASA EONET</a></div>
  </section>;
}
