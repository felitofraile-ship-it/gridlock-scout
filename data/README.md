# Project catalog

`projects.json` holds the first normalized set of public transmission projects. The ten workbook entries were transcribed from `Projects_Overlaps.xlsx` in the user-provided `Sperry-Tech-Challenge.zip`; four additional entries come from the cited utility pages or project lists. The project descriptions and point/line annotations were checked on 2026-09-26.

Each record contains source provenance, a published construction milestone or planned in-service date where available, and a geometry quality code:

- `endpoint_only`: a named endpoint is located; the work route is not.
- `straight_line_approximation`: both named endpoints are located, but the drawn segment is not a surveyed route.
- `regional_marker`: a broad project-area marker, not a site or route.

A past in-service target means only that the published date has elapsed. It does not establish that a project was completed. The interface shows upcoming targets by default and offers a toggle to include past targets.

The app screens every DESC–GPC pair using the closest points on the **mapped** point or straight-line geometry. It flags pairs below 40 km and ranks them with a transparent screening score based primarily on distance, then comparable published dates and location quality. The ZIP's suggested overlap rows are not treated as confirmed matches because they use center-to-center distance. Endpoint-only and regional markers can understate or overstate the distance to the actual work. Even a shared mapped coordinate does not confirm the construction routes touch. Published in-service target gaps are weak timing clues, not proof of overlapping build windows.
