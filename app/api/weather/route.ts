const CURRENT = "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const latitude = Number(params.get("latitude"));
  const longitude = Number(params.get("longitude"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 30 || latitude > 36 || longitude < -86 || longitude > -78) {
    return Response.json({ error: "Location must be within the Georgia–South Carolina study area." }, { status: 400 });
  }

  const upstream = new URL("https://api.open-meteo.com/v1/forecast");
  upstream.searchParams.set("latitude", latitude.toFixed(4));
  upstream.searchParams.set("longitude", longitude.toFixed(4));
  upstream.searchParams.set("current", CURRENT);
  upstream.searchParams.set("temperature_unit", "fahrenheit");
  upstream.searchParams.set("wind_speed_unit", "mph");
  upstream.searchParams.set("precipitation_unit", "inch");
  upstream.searchParams.set("timezone", "America/New_York");

  try {
    const response = await fetch(upstream, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("current" in body)) throw new Error("Weather provider returned incomplete data");
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Live weather is temporarily unavailable. Try again shortly." }, { status: 502 });
  }
}
