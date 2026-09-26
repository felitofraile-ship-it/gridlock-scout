import type { Overlap } from "@/lib/overlaps";
import { isPastTarget } from "@/lib/projects";

export type OpportunityInsight = {
  label: string;
  summary: string;
  jointWork: string;
  timingReason: string;
};

export function opportunityInsight(overlap: Overlap): OpportunityInsight {
  const firstTarget = overlap.desc.schedule.plannedInService;
  const secondTarget = overlap.gpc.schedule.plannedInService;
  const gapDays = firstTarget && secondTarget
    ? Math.round(Math.abs(Date.parse(firstTarget) - Date.parse(secondTarget)) / 86_400_000)
    : null;
  const past = isPastTarget(overlap.desc) || isPastTarget(overlap.gpc);

  let jointWork: string;
  if (overlap.distanceKm < 0.05) {
    jointWork = "Exchange verified GIS coordinates and facility drawings, then compare asset boundaries, access rights, and outage constraints. Confirm the work really shares a site; the mapped reference point alone does not prove it.";
  } else if (overlap.distanceKm < 1.6) {
    jointWork = "Exchange route maps and terrain or vegetation surveys, then compare right-of-way, access roads, and permit boundaries. A joint site visit could identify shared access or construction constraints.";
  } else if (overlap.distanceKm < 8) {
    jointWork = "Exchange detailed site locations and vegetation surveys, then compare staging yards, delivery routes, and contractor plans. Shared mobilization is possible only if the actual construction windows align.";
  } else {
    jointWork = "Exchange verified route or station coordinates, terrain and vegetation surveys, access roads, permit maps, and outage constraints. Shared crews or equipment would require verified, overlapping construction windows.";
  }

  if (past) {
    return {
      label: "Past-target spatial lead",
      summary: "At least one published target has passed. First verify whether work remains; the near locations may still be useful for as-built records, access lessons, and future work planning.",
      jointWork,
      timingReason: "Current construction status is unknown. A past target is not evidence that crews can still coordinate.",
    };
  }
  if (gapDays !== null && gapDays > 365) {
    return {
      label: "Site-information lead",
      summary: "The projects are geographically close, but their in-service targets are more than a year apart. The immediate collaboration is sharing location and site-condition data for future planning.",
      jointWork,
      timingReason: `Published in-service targets are ${Math.round(gapDays / 365)} years apart. These are not construction windows; ask both utilities for actual work dates before revisiting resource sharing.`,
    };
  }
  if (gapDays !== null) {
    return {
      label: "Possible schedule lead",
      summary: "The mapped work is nearby and the published targets are within a year. Confirm the actual build windows to see whether shared logistics or outage planning is practical.",
      jointWork,
      timingReason: `Published in-service targets are ${gapDays} days apart, but that alone does not establish overlapping fieldwork.`,
    };
  }
  return {
    label: "Timing-unverified lead",
    summary: "The mapped work is nearby, but one or both plans give only a seasonal start or omit an in-service date. Exchange local site information now and compare detailed schedules later.",
    jointWork,
    timingReason: "The available dates describe different milestones or are incomplete, so simultaneous construction cannot be inferred.",
  };
}
