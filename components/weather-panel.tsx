"use client";

import { useEffect, useState } from "react";

export type WeatherContext = {
  latitude: number;
  longitude: number;
  locationNote: string;
};

type WeatherData = {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
  };
};

function condition(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 95) return "Thunderstorms";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 71 && code <= 86) return "Snow or wintry showers";
  return "Conditions available";
}

export default function WeatherPanel({ context }: { context: WeatherContext }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setWeather(null);
    const url = `/api/weather?latitude=${context.latitude.toFixed(4)}&longitude=${context.longitude.toFixed(4)}`;
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Weather unavailable");
        return response.json() as Promise<WeatherData>;
      })
      .then((data) => { setWeather(data); setState("ready"); })
      .catch((error) => { if (error.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, [context.latitude, context.longitude, refresh]);

  return <section className="weather-section" aria-label="Current weather">
    <div className="weather-heading"><span className="eyebrow">Current weather</span><span className="weather-live-dot">Live service</span></div>
    <p className="weather-location">{context.locationNote}</p>
    <div className="weather-current-heading"><strong>Conditions now</strong><button type="button" onClick={() => setRefresh((value) => value + 1)}>Refresh</button></div>
    {state === "loading" && <p className="weather-message" role="status">Loading current weather…</p>}
    {state === "error" && <p className="weather-message weather-error" role="alert">Current weather is unavailable. Try refreshing.</p>}
    {state === "ready" && weather && <>
      <div className="weather-metrics">
        <div><strong>{Math.round(weather.current.temperature_2m)}°F</strong><span>{condition(weather.current.weather_code)}</span></div>
        <div><strong>{Math.round(weather.current.wind_speed_10m)} mph</strong><span>Wind · gusts {Math.round(weather.current.wind_gusts_10m)} mph</span></div>
        <div><strong>{weather.current.precipitation.toFixed(2)} in</strong><span>Precipitation now</span></div>
        <div><strong>{Math.round(weather.current.relative_humidity_2m)}%</strong><span>Humidity</span></div>
      </div>
      <p className="weather-time">As of {weather.current.time.replace("T", " ")} Eastern · <a href="https://open-meteo.com/en/docs" target="_blank" rel="noopener noreferrer">Open-Meteo</a></p>
    </>}
    <small className="weather-caveat">Current conditions at an approximate location, not a forecast for the planned work date.</small>
  </section>;
}
