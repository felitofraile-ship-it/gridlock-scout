"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { Project } from "@/lib/projects";
import type { Overlap } from "@/lib/overlaps";

type Region = "savannah" | "augusta";
type Basemap = "satellite" | "streets";

const regions: Record<Region, { center: [number, number]; zoom: number }> = {
  savannah: { center: [32.23, -81.12], zoom: 10 },
  augusta: { center: [33.47, -81.98], zoom: 10 },
};
const colors = { DESC: "#76c8ce", GPC: "#e8a85c" };

export default function GridMap({ projects, overlaps, selectedOverlap, selectedId, onSelect }: { projects: Project[]; overlaps: Overlap[]; selectedOverlap: Overlap | null; selectedId: string | null; onSelect: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const layersRef = useRef<{ satellite: Leaflet.TileLayer; streets: Leaflet.TileLayer } | null>(null);
  const projectLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let instance: Leaflet.Map | null = null;

    async function initialize() {
      if (!containerRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      instance = L.map(containerRef.current, { zoomControl: false }).setView([32.88, -81.52], 8);
      mapRef.current = instance;
      leafletRef.current = L;
      L.control.zoom({ position: "bottomright" }).addTo(instance);
      const satellite = L.tileLayer(
        "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 16,
          attribution: 'Map services and data available from <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map" target="_blank" rel="noopener noreferrer">U.S. Geological Survey, The National Map</a>',
        }
      );
      const streets = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      });
      layersRef.current = { satellite, streets };
      satellite.on("tileerror", () => setLoadError(true));
      satellite.addTo(instance);
      setReady(true);
    }

    initialize();
    return () => {
      cancelled = true;
      instance?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      layersRef.current = null;
      projectLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!ready || !map || !L) return;
    projectLayerRef.current?.remove();
    const group = L.layerGroup().addTo(map);
    projectLayerRef.current = group;

    for (const overlap of overlaps) {
      const selected = overlap.id === selectedOverlap?.id;
      const first: [number, number] = [overlap.first[1], overlap.first[0]];
      const second: [number, number] = [overlap.second[1], overlap.second[0]];
      if (overlap.distanceKm < 0.05) {
        L.circleMarker(first, { radius: selected ? 19 : 12, color: "#ffd18e", weight: selected ? 4 : 2, fillOpacity: 0, dashArray: "3 4", interactive: false }).addTo(group);
      } else {
        L.polyline([first, second], { color: "#ffd18e", weight: selected ? 5 : 2, opacity: selected ? 1 : 0.7, dashArray: selected ? undefined : "5 6", interactive: false }).addTo(group);
      }
    }

    for (const project of projects) {
      const highlighted = project.id === selectedId || project.id === selectedOverlap?.desc.id || project.id === selectedOverlap?.gpc.id;
      const color = colors[project.utility];
      const tooltip = document.createElement("span");
      tooltip.textContent = project.name;
      let layer: Leaflet.Path;

      if (project.geometry.type !== "Point") {
        const paths = project.geometry.type === "LineString" ? [project.geometry.coordinates] : project.geometry.coordinates;
        const points = paths.map((path) => path.map(([lon, lat]) => [lat, lon] as [number, number]));
        layer = L.polyline(points, {
          color,
          weight: highlighted ? 6 : 4,
          opacity: 1,
          dashArray: "9 7",
          lineCap: "round",
        });
      } else {
        const [lon, lat] = project.geometry.coordinates;
        const broad = project.locationQuality === "regional_marker";
        layer = L.circleMarker([lat, lon], {
          radius: highlighted ? (broad ? 17 : 11) : (broad ? 13 : 8),
          color,
          weight: highlighted ? 4 : 3,
          fillColor: color,
          fillOpacity: broad ? 0.2 : 0.85,
          dashArray: broad ? "4 4" : undefined,
        });
      }
      layer.bindTooltip(tooltip, { sticky: true });
      layer.on("click", () => onSelect(project.id));
      layer.addTo(group);
    }

    const selected = projects.find((project) => project.id === selectedId);
    if (selectedOverlap) {
      const points: [number, number][] = [selectedOverlap.first, selectedOverlap.second].map(([lon, lat]) => [lat, lon]);
      map.flyToBounds(L.latLngBounds(points).pad(1.2), { maxZoom: 11, duration: 0.75 });
    } else if (selected) {
      if (selected.geometry.type === "Point") {
        const [lon, lat] = selected.geometry.coordinates;
        map.flyTo([lat, lon], selected.locationQuality === "regional_marker" ? 9 : 11, { duration: 0.75 });
      } else {
        const paths = selected.geometry.type === "LineString" ? [selected.geometry.coordinates] : selected.geometry.coordinates;
        const points = paths.flat().map(([lon, lat]) => [lat, lon] as [number, number]);
        map.flyToBounds(L.latLngBounds(points).pad(0.7), { maxZoom: 11, duration: 0.75 });
      }
    }
    return () => { group.remove(); };
  }, [ready, projects, overlaps, selectedOverlap, selectedId, onSelect]);

  function changeBasemap(next: Basemap) {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (map && layers && next !== basemap) {
      map.removeLayer(layers[basemap]);
      layers[next].addTo(map);
    }
    setBasemap(next);
    setLoadError(false);
  }

  function focus(region: Region) {
    const { center, zoom } = regions[region];
    mapRef.current?.flyTo(center, zoom, { duration: 0.8 });
  }

  return (
    <div className="map-frame">
      <div ref={containerRef} className="leaflet-map" aria-label="Interactive map with utility projects" />
      <div className="map-toolbar" aria-label="Map controls">
        <div className="map-toggle" role="group" aria-label="Map style">
          <button type="button" aria-pressed={basemap === "satellite"} onClick={() => changeBasemap("satellite")}>Satellite</button>
          <button type="button" aria-pressed={basemap === "streets"} onClick={() => changeBasemap("streets")}>Streets</button>
        </div>
        <div className="map-places" role="group" aria-label="Map locations">
          <button type="button" onClick={() => focus("savannah")}>Savannah</button>
          <button type="button" onClick={() => focus("augusta")}>Augusta</button>
        </div>
      </div>
      <div className="map-legend" aria-label="Project map legend">
        <span><i className="legend-dot desc" /> Dominion</span>
        <span><i className="legend-dot gpc" /> Georgia Power</span>
        <span><i className="legend-line" /> Proximity candidate</span>
        <small>Dashed shapes and orange links use approximate locations</small>
      </div>
      {loadError && basemap === "satellite" && (
        <p className="map-error" role="status">Imagery is temporarily unavailable. Try the Streets view.</p>
      )}
    </div>
  );
}
