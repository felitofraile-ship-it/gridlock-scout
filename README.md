# Gridlock Scout

An interactive map foundation for comparing public transmission construction plans from Dominion Energy South Carolina and Georgia Power.

## Run locally

Requires Node.js 22.13 or newer and pnpm 11.

```sh
pnpm install
pnpm dev
```

Open the local URL printed by the server. Run `pnpm build` to check the production build.

## Current scope

The app displays a 14-project seed catalog: seven Dominion Energy South Carolina projects and seven Georgia Power projects. Ten entries come from the challenge workbook and four from public project pages or lists. Each record carries a source, schedule fields, and a location-accuracy note. Upcoming published targets appear by default; **Show past targets** adds older milestones. A past target does not prove a project was completed.

The map uses USGS aerial imagery, with a streets fallback and shortcuts to Savannah and Augusta. It shows proximity links and a computed opportunity ranking. Every cross-utility pair within 40 km receives a screening score: up to 70 points for closest mapped distance, up to 20 for proximity of published construction starts (reduced for seasonal starts), and up to 10 for the weaker of the pair's mapped-location quality. When both projects have only in-service targets, their date proximity contributes at most 6 of the 20 timing points; mixed or missing milestones contribute zero. A score is a prioritization aid, not proof of shared work. Each opportunity card shows both projects' published in-service targets or tentative construction starts. The same prominent date appears on every project card. Selecting a project or pair opens a compact summary and a scoped planning chat. These milestones are not a fieldwork schedule.

The assistant can call [Open-Meteo's current conditions API](https://open-meteo.com/en/docs) through `/api/weather` when asked about weather. For a project, weather is sampled near its approximate mapped location; for an opportunity, it is sampled midway between the pair's closest mapped points. Current conditions do not describe weather on a future construction date.

Each opportunity now includes a reasoned coordination summary. Published in-service targets are not construction windows, so dates more than a year apart are labeled **site-information leads** for sharing access, terrain, permit, and outage knowledge. Past targets are labeled separately until current status is verified. Shared crews or equipment remain conditional on confirmed build dates.

The assistant can also call `/api/area-conditions` for 2025 tree-canopy samples from the [MRLC map service](https://www.mrlc.gov/data-services-page), elevation at the mapped points from [USGS EPQS](https://apps.nationalmap.gov/epqs/), active alerts at the pair midpoint from [NWS](https://www.weather.gov/documentation/services-web-alerts), and open fire events with a report in the last 14 days within 50 km of either mapped point from [NASA EONET](https://eonet.gsfc.nasa.gov/docs/v3). EONET's wildfire category can include prescribed burns. A canopy percentage does not reveal tree age; point samples do not establish conditions along the whole route, and an empty alert/event result does not prove an area is hazard-free.

## Gemini chat setup

The assistant uses the [Gemini Generate Content API](https://ai.google.dev/gemini-api/docs/generate-content/get-started) through the server-only `/api/chat` route. It answers about the selected catalog record or opportunity and can request current weather or area-condition tools. It does not accept project facts from the browser; the server looks up the selected ID and supplies the public source records. Chat history stays in the current browser session. Questions and selected public planning context are sent to Google's Gemini API when chat is used.

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey) under your Google account. A Gemini chat subscription does not authenticate API calls.
2. Copy `.env.example` to `.env.local`, set `GEMINI_API_KEY` there, and restart `pnpm dev`.

The default model is `gemini-3.5-flash-lite`; set `GEMINI_MODEL` to another available model if needed. The key is read only by the server route and is not sent to the browser. Without a key, the chat shows its setup state and sends no question to Gemini. The map, dates, and estimate remain available.

The Okatie–McIntosh / Goshen–McIntosh candidate includes an editable **shared regional survey** scenario. Its starting values are explicitly illustrative: two $20,000 separate surveys versus a $28,000 joint survey and $5,000 coordination overhead, for a possible $7,000 saving. The formula updates immediately as assumptions change. Neither utility published these survey costs; the two study areas and permission to share results have not been confirmed. No crew or staging-yard saving is assumed.

## Source check: Augusta pair

The original Urquhart–Aiken / Callaway Road–Thomson lead was 39.9 km apart using broad markers. [Georgia Power's project page](https://www.georgiapower.com/about/grid-reliability/grid-improvements/grid-projects/transmission-projects/callaway-thomson.html) embeds two preliminary route polylines and substation points. Their coordinates are now in `data/projects.json`, giving a minimum of **46.0 km from DESC's approximate Urquhart-area marker**. The app removes that pair from the 40 km list and explains the check. Georgia Power warns the route is not based on field survey data, so this remains a screening result.

The same Georgia Power page tentatively places substation construction in spring 2027 and line construction in summer 2027. [DESC's project 37](https://www.scrtp.com/assets/pdfs/home/2025-2029-2million-and-above-project-descriptions.pdf) identifies a 4.5-mile Urquhart–Aiken PSA line section with a December 31, 2027 in-service target. DESC does not publish the actual route or field construction window in that list. **The exact distance between final work sites and any simultaneous work window remain unverified.** The app does not treat the matching year as a confirmed schedule overlap.

The `data/projects.json` file is the normalized catalog. The lines shown from workbook endpoints are straight-line approximations, and broad regional points are not worksite coordinates. The 40 km results are **screening candidates**, not confirmed construction overlaps. A shared mapped point does not prove that the work routes touch. Field routes and current project status must be checked before coordination decisions.

The imagery is provided by [The National Map](https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer). Its imagery is a geographic backdrop and does not represent current construction activity.
