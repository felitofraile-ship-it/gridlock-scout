"use client";

import type { Overlap } from "@/lib/overlaps";
import { opportunityInsight } from "@/lib/opportunity-insight";
import ProjectDate from "@/components/project-date";
import ImpactEstimate from "@/components/impact-estimate";
import PlanningChat from "@/components/planning-chat";

export default function OpportunityDetail({ overlap, onClose, onViewMap }: { overlap: Overlap; onClose: () => void; onViewMap: () => void }) {
  const insight = opportunityInsight(overlap);
  return <section className="opportunity-detail" aria-label="Selected coordination opportunity">
    <div className="opportunity-detail-head"><span className="eyebrow">Selected opportunity</span><button type="button" aria-label="Close opportunity details" onClick={onClose}>×</button></div>
    <h3>{overlap.desc.name} <span>↔</span> {overlap.gpc.name}</h3>
    <div className="compact-facts"><strong>{overlap.distanceKm.toFixed(1)} km apart</strong><span>{insight.label}</span></div>
    <div className="compact-project-dates"><div><span>Dominion</span><ProjectDate project={overlap.desc} /></div><div><span>Georgia Power</span><ProjectDate project={overlap.gpc} /></div></div>
    <div className="compact-actions"><button className="view-map-button" type="button" onClick={onViewMap}>View on map</button><details className="detail-sources"><summary>Plan sources</summary>{overlap.desc.source.url && <a href={overlap.desc.source.url} target="_blank" rel="noopener noreferrer">Dominion plan ↗</a>}{overlap.gpc.source.url && <a href={overlap.gpc.source.url} target="_blank" rel="noopener noreferrer">Georgia Power plan ↗</a>}</details></div>
    {overlap.id === "DESC_OKATIE_MCINTOSH__GPC_3" && <details className="estimate-disclosure"><summary>Explore possible survey savings</summary><ImpactEstimate /></details>}
    <PlanningChat key={overlap.id} scope={{ type: "opportunity", id: overlap.id }} />
  </section>;
}
