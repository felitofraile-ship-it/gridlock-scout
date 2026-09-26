import { formatProjectDate, isPastTarget, type Project } from "@/lib/projects";

export default function ProjectDate({ project }: { project: Project }) {
  const seasonalStart = project.schedule.constructionStartLabel;
  const constructionStart = project.schedule.constructionStart;
  const date = seasonalStart ?? formatProjectDate(constructionStart ?? project.schedule.plannedInService);
  const label = seasonalStart || constructionStart ? "Tentative start" : "In-service target";

  return <span className={`project-date ${isPastTarget(project) ? "past" : ""}`}>
    <span>{label}</span>
    <strong>{date}</strong>
  </span>;
}
