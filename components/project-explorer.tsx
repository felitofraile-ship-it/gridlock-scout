"use client";

import { useMemo, useState } from "react";
import GridMap from "@/components/grid-map";
import OpportunityDetail from "@/components/opportunity-detail";
import PlanningChat from "@/components/planning-chat";
import ProjectDate from "@/components/project-date";
import { closestProjectPoints, findOverlaps, type Overlap } from "@/lib/overlaps";
import { opportunityInsight } from "@/lib/opportunity-insight";
import { isPastTarget, projects, type Project } from "@/lib/projects";

const utilityNames = { DESC: "Dominion Energy SC", GPC: "Georgia Power" };

function ProjectCard({ project, selected, onSelect }: { project: Project; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`project-card ${project.utility.toLowerCase()} ${selected ? "selected" : ""}`} onClick={onSelect} aria-pressed={selected}>
      <span className={`utility-tag ${project.utility.toLowerCase()}`}>{utilityNames[project.utility]}</span>
      <strong>{project.name}</strong>
      <ProjectDate project={project} />
      {isPastTarget(project) && <span className="project-card-meta">Past target · current status unverified</span>}
    </button>
  );
}

export default function ProjectExplorer() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOverlapId, setSelectedOverlapId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [showAllOverlaps, setShowAllOverlaps] = useState(false);
  const selected = projects.find((project) => project.id === selectedId) ?? null;
  const visibleProjects = useMemo(() => {
    const filtered = showPast ? projects : projects.filter((project) => !isPastTarget(project));
    return [...filtered].sort((a, b) => {
      const aDate = a.schedule.constructionStart ?? a.schedule.constructionStartLabel?.match(/\d{4}/)?.[0] ?? a.schedule.plannedInService ?? "9999";
      const bDate = b.schedule.constructionStart ?? b.schedule.constructionStartLabel?.match(/\d{4}/)?.[0] ?? b.schedule.plannedInService ?? "9999";
      return aDate.localeCompare(bDate);
    });
  }, [showPast]);
  const pastCount = projects.filter((project) => isPastTarget(project)).length;
  const overlaps = useMemo(() => findOverlaps(visibleProjects), [visibleProjects]);
  const selectedOverlap = overlaps.find((overlap) => overlap.id === selectedOverlapId) ?? null;
  const nearestSelectedOverlap = selectedId ? overlaps.find((overlap) => overlap.desc.id === selectedId || overlap.gpc.id === selectedId) ?? null : null;
  const displayedOverlaps = showAllOverlaps ? overlaps : overlaps.slice(0, 6);
  const urquhart = projects.find((project) => project.id === "DESC_URQUHART_AIKEN")!;
  const callaway = projects.find((project) => project.id === "GPC_CALLAWAY_THOMSON")!;
  const augustaCheck = closestProjectPoints(urquhart, callaway);

  function selectOverlap(overlap: Overlap) {
    setSelectedOverlapId(overlap.id);
    setSelectedId(null);
    requestAnimationFrame(() => document.querySelector(".opportunity-detail")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  function selectProject(id: string) {
    setSelectedId(id);
    setSelectedOverlapId(null);
    requestAnimationFrame(() => document.querySelector(".project-detail")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <h1>Gridlock Scout</h1>
          <p>Cross-utility construction planning</p>
        </div>
      </header>

      <div className="workspace">
        <section className="map-section" aria-label="Map of Georgia and South Carolina">
          <GridMap projects={visibleProjects} overlaps={overlaps} selectedOverlap={selectedOverlap ?? nearestSelectedOverlap} selectedId={selectedId} onSelect={selectProject} />
        </section>
        <aside className="project-panel" aria-label="Project information">
          <div className="panel-heading">
            <span className="eyebrow">Project explorer</span>
            <h2>Public transmission plans</h2>
            <p>Select a project or pair to explore the plan and ask questions.</p>
          </div>
          <label className="catalog-filter"><span className="past-toggle"><input type="checkbox" checked={showPast} onChange={(event) => { setShowPast(event.target.checked); setSelectedId(null); setSelectedOverlapId(null); }} /> Show {pastCount} past targets</span></label>

          <section className="overlap-section" aria-label="Coordination opportunities">
            <div className="overlap-heading"><span className="eyebrow">Coordination opportunities</span><strong>{overlaps.length} within 40 km</strong></div>
            <details className="route-check"><summary>Why one Augusta pair was removed</summary>
              <p>The broad markers suggested a 39.9 km lead. Georgia Power’s published preliminary route coordinates put Callaway Road–Thomson about <b>{augustaCheck.distanceKm.toFixed(1)} km</b> from DESC’s <em>approximate</em> Urquhart-area marker, outside the 40 km screen. This is still not a measured distance between final work sites.</p>
              <p><b>Timing:</b> Georgia Power tentatively lists line construction from summer 2027. DESC lists the Urquhart–Aiken 4.5-mile section with a December 31, 2027 in-service target, but no field construction dates. A shared work window is unverified.</p>
              <div><button type="button" onClick={() => selectProject(callaway.id)}>See mapped route</button><a href={callaway.source.url!} target="_blank" rel="noopener noreferrer">Georgia Power route and timeline ↗</a><a href={urquhart.source.url!} target="_blank" rel="noopener noreferrer">DESC project 37 ↗</a></div>
            </details>
            <div className="overlap-list">
              {displayedOverlaps.map((overlap, index) => {
                const insight = opportunityInsight(overlap);
                return (
                <button key={overlap.id} type="button" className={`overlap-card ${selectedOverlapId === overlap.id ? "selected" : ""}`} onClick={() => selectOverlap(overlap)} aria-pressed={selectedOverlapId === overlap.id}>
                  <span className="overlap-card-top"><b>#{index + 1} · {overlap.tier}</b><strong>{overlap.distanceKm < 0.05 ? "Same reference point" : `${overlap.distanceKm.toFixed(1)} km`}</strong></span>
                  <span className="overlap-projects"><span><span className="overlap-project-name"><i className="project-dot desc" />{overlap.desc.name}</span><ProjectDate project={overlap.desc} /></span><span><span className="overlap-project-name"><i className="project-dot gpc" />{overlap.gpc.name}</span><ProjectDate project={overlap.gpc} /></span></span>
                  <span className="overlap-label">{insight.label}</span>
                </button>
              );})}
            </div>
            {overlaps.length > 6 && <button className="show-more" type="button" onClick={() => setShowAllOverlaps((value) => !value)}>{showAllOverlaps ? "Show top 6" : `Show all ${overlaps.length}`}</button>}
            {selectedOverlap && <OpportunityDetail overlap={selectedOverlap} onClose={() => setSelectedOverlapId(null)} onViewMap={() => document.querySelector(".map-section")?.scrollIntoView({ behavior: "smooth", block: "start" })} />}
          </section>

          {selected && (
            <section className="project-detail" aria-label="Selected project">
              <div className="detail-head">
                <span className={`utility-tag ${selected.utility.toLowerCase()}`}>{utilityNames[selected.utility]}</span>
                <button type="button" className="close-detail" onClick={() => setSelectedId(null)} aria-label="Close project details">×</button>
              </div>
              <h3>{selected.name}</h3>
              <ProjectDate project={selected} />
              {isPastTarget(selected) && <p className="status-note">Past target · current status unverified</p>}
              {nearestSelectedOverlap && <div className="nearby-match"><strong>Closest cross-utility candidate</strong><p>{(nearestSelectedOverlap.desc.id === selected.id ? nearestSelectedOverlap.gpc : nearestSelectedOverlap.desc).name} · {nearestSelectedOverlap.distanceKm < 0.05 ? "same mapped reference point" : `${nearestSelectedOverlap.distanceKm.toFixed(1)} km apart`}</p><button type="button" onClick={() => selectOverlap(nearestSelectedOverlap)}>Open pair details</button></div>}
              {selected.source.url && <a className="compact-source-link" href={selected.source.url} target="_blank" rel="noopener noreferrer">Original plan ↗</a>}
              <PlanningChat key={selected.id} scope={{ type: "project", id: selected.id }} />
            </section>
          )}

          <div className="list-heading">
            <h3>All {showPast ? "projects" : "upcoming projects"} <span>{visibleProjects.length}</span></h3>
          </div>
          <div className="project-list">
            {visibleProjects.length === 0 && <p className="empty-projects">No upcoming projects have a published future milestone. Turn on past targets to inspect the full catalog.</p>}
            {visibleProjects.map((project) => <ProjectCard key={project.id} project={project} selected={selectedId === project.id} onSelect={() => selectProject(project.id)} />)}
          </div>
        </aside>
      </div>
    </main>
  );
}
