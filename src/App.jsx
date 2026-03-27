import { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart,
} from "recharts";
import "./App.css";

/* ===== CONSTANTS ===== */
const DEFAULT_LAT = 47.0707, DEFAULT_LON = 15.4395, DEFAULT_TZ = "Europe/Vienna", DEFAULT_CITY = "Graz";
const LS_KEY = "wetterzentrale-web-settings";
const CACHE_KEY = "wetterzentrale-web-cache";
const CACHE_TTL = 15 * 60 * 1000;

const WEATHER_CODES = {
  0:{label:"Klar",icon:"\u2600\uFE0F",s:0},1:{label:"\u00dcberwiegend klar",icon:"\uD83C\uDF24\uFE0F",s:0},
  2:{label:"Teilweise bew\u00f6lkt",icon:"\u26C5",s:0},3:{label:"Bew\u00f6lkt",icon:"\u2601\uFE0F",s:0},
  45:{label:"Nebel",icon:"\uD83C\uDF2B\uFE0F",s:1},48:{label:"Reifnebel",icon:"\uD83C\uDF2B\uFE0F",s:1},
  51:{label:"Leichter Nieselregen",icon:"\uD83C\uDF26\uFE0F",s:0},53:{label:"Nieselregen",icon:"\uD83C\uDF26\uFE0F",s:0},
  55:{label:"Starker Nieselregen",icon:"\uD83C\uDF27\uFE0F",s:1},56:{label:"Gefr. Nieselregen",icon:"\uD83C\uDF27\uFE0F",s:2},
  57:{label:"Starker gefr. Niesel",icon:"\uD83C\uDF27\uFE0F",s:2},
  61:{label:"Leichter Regen",icon:"\uD83C\uDF27\uFE0F",s:0},63:{label:"Regen",icon:"\uD83C\uDF27\uFE0F",s:1},
  65:{label:"Starker Regen",icon:"\uD83C\uDF27\uFE0F",s:2},66:{label:"Gefrierender Regen",icon:"\uD83C\uDF27\uFE0F",s:3},
  67:{label:"Starker gefr. Regen",icon:"\uD83C\uDF27\uFE0F",s:3},
  71:{label:"Leichter Schneefall",icon:"\uD83C\uDF28\uFE0F",s:1},73:{label:"Schneefall",icon:"\u2744\uFE0F",s:2},
  75:{label:"Starker Schneefall",icon:"\u2744\uFE0F",s:3},77:{label:"Schneegriesel",icon:"\u2744\uFE0F",s:1},
  80:{label:"Leichte Schauer",icon:"\uD83C\uDF26\uFE0F",s:0},81:{label:"Regenschauer",icon:"\uD83C\uDF27\uFE0F",s:1},
  82:{label:"Heftige Schauer",icon:"\u26C8\uFE0F",s:2},
  85:{label:"Leichte Schneeschauer",icon:"\uD83C\uDF28\uFE0F",s:1},86:{label:"Schneeschauer",icon:"\u2744\uFE0F",s:2},
  95:{label:"Gewitter",icon:"\u26C8\uFE0F",s:3},96:{label:"Gewitter mit Hagel",icon:"\u26C8\uFE0F",s:3},
  99:{label:"Starkes Gewitter",icon:"\u26C8\uFE0F",s:3},
};

const lightTheme = {
  bg:"#f0f4f8",card:"#ffffff",text:"#1e293b",ts:"#64748b",
  ac:"#0284c7",acs:"rgba(2,132,199,0.08)",brd:"#e2e8f0",
  dBg:"rgba(239,68,68,0.06)",dBr:"rgba(239,68,68,0.25)",dTx:"#dc2626",
  wBg:"rgba(249,115,22,0.06)",wBr:"rgba(249,115,22,0.25)",wTx:"#ea580c",
  pBg:"rgba(234,179,8,0.06)",pBr:"rgba(234,179,8,0.25)",pTx:"#a16207",
  oBg:"rgba(34,197,94,0.06)",oBr:"rgba(34,197,94,0.2)",oTx:"#16a34a",
  heroGrad:"linear-gradient(135deg, #e0f2fe, #f0f9ff, #ede9fe)",
};
const darkTheme = {
  bg:"#0f1117",card:"#1a1d27",text:"#e2e8f0",ts:"#94a3b8",
  ac:"#38bdf8",acs:"rgba(56,189,248,0.12)",brd:"#2d3344",
  dBg:"rgba(239,68,68,0.12)",dBr:"rgba(239,68,68,0.3)",dTx:"#fca5a5",
  wBg:"rgba(249,115,22,0.12)",wBr:"rgba(249,115,22,0.3)",wTx:"#fdba74",
  pBg:"rgba(234,179,8,0.12)",pBr:"rgba(234,179,8,0.3)",pTx:"#fde047",
  oBg:"rgba(34,197,94,0.1)",oBr:"rgba(34,197,94,0.25)",oTx:"#86efac",
  heroGrad:"linear-gradient(135deg, #1e293b, #0f172a, #1e1b4b)",
};

/* ===== HELPER FUNCTIONS ===== */
const getW = (code) => WEATHER_CODES[code] || { label: "Unbekannt", icon: "\u2753", s: 0 };

const getComfort = (temp, hum, wind) => {
  if (temp === undefined || temp === null) return { label: "\u2013", color: "#888", emoji: "\u2013" };
  const h = temp + 0.5 * (hum || 50) / 100 * 10 - (wind || 0) * 0.3;
  if (h < -5) return { label: "Eisig", color: "#60a5fa", emoji: "\uD83E\uDD76" };
  if (h < 5) return { label: "Kalt", color: "#93c5fd", emoji: "\u2744\uFE0F" };
  if (h < 12) return { label: "Frisch", color: "#a5b4fc", emoji: "\uD83E\uDDE5" };
  if (h < 20) return { label: "Angenehm", color: "#34d399", emoji: "\uD83D\uDE0A" };
  if (h < 26) return { label: "Warm", color: "#fbbf24", emoji: "\u2600\uFE0F" };
  if (h < 32) return { label: "Hei\u00df", color: "#f97316", emoji: "\uD83E\uDD75" };
  return { label: "Schw\u00fcl", color: "#ef4444", emoji: "\uD83D\uDD25" };
};

const getScore = (code, temp, wind, uv) => {
  let s = 10;
  if ([95,96,99].includes(code)) s -= 5;
  else if ([61,63,65,66,67,80,81,82].includes(code)) s -= 3;
  else if ([51,53,55,56,57,71,73,75].includes(code)) s -= 2;
  else if ([45,48].includes(code)) s -= 1.5;
  else if ([3].includes(code)) s -= 0.5;
  if (temp !== undefined && temp !== null) { if (temp < 0) s -= 1.5; else if (temp < 5) s -= 0.5; else if (temp > 35) s -= 2; else if (temp > 30) s -= 1; }
  if (wind > 50) s -= 2; else if (wind > 30) s -= 1;
  if (uv > 8) s -= 1;
  return Math.max(1, Math.min(10, Math.round(s)));
};

const getClothing = (temp, code, uv, wind) => {
  const t = [];
  if (temp < 0) t.push("\uD83E\uDDE3 Winterjacke"); else if (temp < 10) t.push("\uD83E\uDDE5 Warme Jacke"); else if (temp < 18) t.push("\uD83D\uDC54 Pullover"); else if (temp < 25) t.push("\uD83D\uDC55 T-Shirt"); else t.push("\uD83E\uDE73 Kurze Hosen");
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code)) t.push("\u2602\uFE0F Regenschirm!");
  if (uv >= 6) t.push("\uD83E\uDDF4 Sonnencreme!");
  if (wind > 40) t.push("\uD83D\uDCA8 Windschutz");
  return t.join(" \u2022 ");
};

const windDir = (d) => { if (d == null) return "\u2013"; const dirs = ["N","NNO","NO","ONO","O","OSO","SO","SSO","S","SSW","SW","WSW","W","WNW","NW","NNW"]; return dirs[Math.round(d / 22.5) % 16]; };

const moonPhase = (date) => {
  const dd = new Date(date); let y = dd.getFullYear(), m = dd.getMonth() + 1;
  if (m < 3) { y--; m += 12; }
  const jd = dd.getDate() + Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) - 1524.5;
  let b = ((jd - 2451550.1) / 29.530588853) % 1; if (b < 0) b += 1;
  const age = Math.round(b * 29.53);
  if (age < 2) return { i: "\uD83C\uDF11", l: "Neumond" }; if (age < 7) return { i: "\uD83C\uDF12", l: "Zunehmend" };
  if (age < 9) return { i: "\uD83C\uDF13", l: "Erstes Viertel" }; if (age < 14) return { i: "\uD83C\uDF14", l: "Zunehmend" };
  if (age < 16) return { i: "\uD83C\uDF15", l: "Vollmond" }; if (age < 21) return { i: "\uD83C\uDF16", l: "Abnehmend" };
  if (age < 23) return { i: "\uD83C\uDF17", l: "Letztes Viertel" }; if (age < 28) return { i: "\uD83C\uDF18", l: "Abnehmend" };
  return { i: "\uD83C\uDF11", l: "Neumond" };
};

const convertTemp = (c, unit) => c == null ? "\u2013" : unit === "\u00b0F" ? String(Math.round(c * 9 / 5 + 32)) : String(Math.round(c));
const convertWind = (k, unit) => k == null ? "\u2013" : unit === "m/s" ? (k / 3.6).toFixed(1) : String(Math.round(k));

const fmtDate = (s) => new Date(s).toLocaleDateString("de-AT", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (s) => new Date(s).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });

const pollenLvl = (v) => {
  if (v == null || v <= 0) return { l: "Keine", c: "#22c55e", n: 0 };
  if (v < 10) return { l: "Gering", c: "#84cc16", n: 1 };
  if (v < 30) return { l: "M\u00e4\u00dfig", c: "#eab308", n: 2 };
  if (v < 60) return { l: "Hoch", c: "#f97316", n: 3 };
  return { l: "Sehr hoch", c: "#ef4444", n: 4 };
};

const aqiLevel = (v) => {
  if (v == null || v <= 20) return { l: "Gut", c: "#22c55e", emoji: "\uD83D\uDE0A", n: 1 };
  if (v <= 40) return { l: "M\u00e4\u00dfig", c: "#84cc16", emoji: "\uD83D\uDE42", n: 2 };
  if (v <= 60) return { l: "Mittel", c: "#eab308", emoji: "\uD83D\uDE10", n: 3 };
  if (v <= 80) return { l: "Schlecht", c: "#f97316", emoji: "\uD83D\uDE37", n: 4 };
  if (v <= 100) return { l: "Sehr schlecht", c: "#ef4444", emoji: "\uD83E\uDD22", n: 5 };
  return { l: "Gef\u00e4hrlich", c: "#991b1b", emoji: "\u2620\uFE0F", n: 6 };
};

const pmLevel = (v, type) => {
  if (type === "pm25") {
    if (v <= 10) return { l: "Gut", c: "#22c55e" }; if (v <= 20) return { l: "M\u00e4\u00dfig", c: "#84cc16" };
    if (v <= 25) return { l: "Mittel", c: "#eab308" }; if (v <= 50) return { l: "Schlecht", c: "#f97316" };
    return { l: "Sehr schlecht", c: "#ef4444" };
  }
  if (v <= 20) return { l: "Gut", c: "#22c55e" }; if (v <= 40) return { l: "M\u00e4\u00dfig", c: "#84cc16" };
  if (v <= 50) return { l: "Mittel", c: "#eab308" }; if (v <= 100) return { l: "Schlecht", c: "#f97316" };
  return { l: "Sehr schlecht", c: "#ef4444" };
};

const gasLevel = (v, type) => {
  if (type === "no2") { if (v <= 40) return { l: "Gut", c: "#22c55e" }; if (v <= 90) return { l: "M\u00e4\u00dfig", c: "#84cc16" }; if (v <= 120) return { l: "Mittel", c: "#eab308" }; if (v <= 230) return { l: "Schlecht", c: "#f97316" }; return { l: "Sehr schlecht", c: "#ef4444" }; }
  if (type === "o3") { if (v <= 50) return { l: "Gut", c: "#22c55e" }; if (v <= 100) return { l: "M\u00e4\u00dfig", c: "#84cc16" }; if (v <= 130) return { l: "Mittel", c: "#eab308" }; if (v <= 240) return { l: "Schlecht", c: "#f97316" }; return { l: "Sehr schlecht", c: "#ef4444" }; }
  if (type === "so2") { if (v <= 100) return { l: "Gut", c: "#22c55e" }; if (v <= 200) return { l: "M\u00e4\u00dfig", c: "#84cc16" }; if (v <= 350) return { l: "Mittel", c: "#eab308" }; if (v <= 500) return { l: "Schlecht", c: "#f97316" }; return { l: "Sehr schlecht", c: "#ef4444" }; }
  if (type === "co") { if (v <= 4400) return { l: "Gut", c: "#22c55e" }; if (v <= 9400) return { l: "M\u00e4\u00dfig", c: "#84cc16" }; if (v <= 12400) return { l: "Mittel", c: "#eab308" }; if (v <= 15400) return { l: "Schlecht", c: "#f97316" }; return { l: "Sehr schlecht", c: "#ef4444" }; }
  return { l: "\u2013", c: "#888" };
};

function getSeasonalLevel(month, hour, type) {
  const isDaytime = hour >= 8 && hour <= 18;
  const daytimeFactor = isDaytime ? 1 : 0.1;
  switch (type) {
    case "birch": if (month >= 3 && month <= 5) return (20 + Math.sin(hour / 3) * 15) * daytimeFactor; if (month === 6) return (5 + Math.sin(hour / 4) * 3) * daytimeFactor; return 0;
    case "grass": if (month >= 5 && month <= 8) return (35 + Math.sin(hour / 3) * 20) * daytimeFactor; if (month === 4 || month === 9) return (5 + Math.sin(hour / 5) * 3) * daytimeFactor; return 0;
    case "alder": if (month >= 2 && month <= 4) return (15 + Math.sin(hour / 4) * 10) * daytimeFactor; if (month === 1) return (3 + Math.sin(hour / 6) * 2) * daytimeFactor; return 0;
    case "mugwort": if (month >= 7 && month <= 9) return (25 + Math.sin(hour / 3) * 15) * daytimeFactor; return 0;
    case "ragweed": if (month >= 8 && month <= 10) return (20 + Math.sin(hour / 3) * 12) * daytimeFactor; return 0;
    case "olive": if (month >= 5 && month <= 6) return (10 + Math.sin(hour / 4) * 6) * daytimeFactor; return 0;
    default: return 0;
  }
}

function generateAlerts(weather, airQuality) {
  const alerts = [];
  if (!weather) return alerts;
  const { daily, hourly } = weather;
  // Extreme weather codes
  if (daily && daily.weather_code) {
    daily.weather_code.forEach((code, i) => {
      const w = getW(code);
      if (w.s >= 3) alerts.push({ severity: "danger", icon: w.icon, title: `${w.label} am ${fmtDate(daily.time[i])}`, text: "Extreme Wetterbedingungen erwartet. Bleiben Sie nach M\u00f6glichkeit zu Hause." });
      else if (w.s >= 2) alerts.push({ severity: "warning", icon: w.icon, title: `${w.label} am ${fmtDate(daily.time[i])}`, text: "Sch\u00fctzende Ma\u00dfnahmen empfohlen." });
    });
  }
  // Temperature extremes
  if (daily && daily.temperature_2m_max) {
    daily.temperature_2m_max.forEach((t, i) => {
      if (t > 35) alerts.push({ severity: "danger", icon: "\uD83C\uDF21\uFE0F", title: `Hitzewarnung: ${Math.round(t)}\u00b0C am ${fmtDate(daily.time[i])}`, text: "Trinken Sie viel Wasser. Vermeiden Sie direkte Sonne." });
    });
    daily.temperature_2m_min.forEach((t, i) => {
      if (t < -10) alerts.push({ severity: "danger", icon: "\u2744\uFE0F", title: `Extremk\u00e4lte: ${Math.round(t)}\u00b0C am ${fmtDate(daily.time[i])}`, text: "Gefahr von Erfrierungen. Warme Kleidung tragen!" });
    });
  }
  // Wind
  if (daily && daily.wind_gusts_10m_max) {
    daily.wind_gusts_10m_max.forEach((g, i) => {
      if (g > 80) alerts.push({ severity: "danger", icon: "\uD83C\uDF2A\uFE0F", title: `Sturmwarnung: B\u00f6en ${Math.round(g)} km/h am ${fmtDate(daily.time[i])}`, text: "Nicht ins Freie gehen. Gegenst\u00e4nde sichern!" });
      else if (g > 60) alerts.push({ severity: "warning", icon: "\uD83D\uDCA8", title: `Starker Wind: B\u00f6en ${Math.round(g)} km/h am ${fmtDate(daily.time[i])}`, text: "Vorsicht beim Aufenthalt im Freien." });
    });
  }
  // UV
  if (daily && daily.uv_index_max) {
    daily.uv_index_max.forEach((uv, i) => {
      if (uv >= 8) alerts.push({ severity: "warning", icon: "\u2600\uFE0F", title: `Hoher UV-Index: ${Math.round(uv)} am ${fmtDate(daily.time[i])}`, text: "Sonnenschutz unbedingt verwenden!" });
    });
  }
  // Heavy rain
  if (daily && daily.precipitation_sum) {
    daily.precipitation_sum.forEach((r, i) => {
      if (r > 30) alerts.push({ severity: "warning", icon: "\uD83C\uDF27\uFE0F", title: `Starkregen: ${r.toFixed(1)} mm am ${fmtDate(daily.time[i])}`, text: "\u00dcberschwemmungsgefahr m\u00f6glich." });
    });
  }
  // Air quality
  if (airQuality && airQuality.current && airQuality.current.european_aqi > 60) {
    const a = aqiLevel(airQuality.current.european_aqi);
    alerts.push({ severity: airQuality.current.european_aqi > 80 ? "danger" : "warning", icon: "\uD83D\uDE37", title: `Luftqualit\u00e4t: ${a.l}`, text: "Reduzieren Sie k\u00f6rperliche Aktivit\u00e4t im Freien." });
  }
  // Pollen
  const now = new Date();
  const maxPollen = Math.max(...["birch","grass","alder","mugwort","ragweed","olive"].map(t => getSeasonalLevel(now.getMonth()+1, now.getHours(), t)));
  if (maxPollen >= 60) alerts.push({ severity: "warning", icon: "\uD83C\uDF3C", title: "Hohe Pollenbelastung", text: "Allergiker sollten besondere Vorsicht walten lassen." });
  return alerts;
}

function generateExpertText(weather) {
  if (!weather || !weather.current) return "";
  const c = weather.current;
  const w = getW(c.weather_code);
  const score = getScore(c.weather_code, c.temperature_2m, c.wind_speed_10m, c.uv_index);
  let text = `Derzeit ${w.label.toLowerCase()} bei ${Math.round(c.temperature_2m)}\u00b0C`;
  if (c.apparent_temperature != null) text += ` (gef\u00fchlt ${Math.round(c.apparent_temperature)}\u00b0C)`;
  text += `. `;
  if (c.wind_speed_10m > 30) text += `Der Wind weht kr\u00e4ftig mit ${Math.round(c.wind_speed_10m)} km/h. `;
  else text += `Wind ${Math.round(c.wind_speed_10m)} km/h aus ${windDir(c.wind_direction_10m)}. `;
  if (c.uv_index >= 6) text += `UV-Index hoch (${Math.round(c.uv_index)}) \u2013 Sonnenschutz empfohlen. `;
  text += `Wetter-Score: ${score}/10. `;
  if (weather.daily) {
    const todayMax = weather.daily.temperature_2m_max?.[0];
    const todayMin = weather.daily.temperature_2m_min?.[0];
    if (todayMax != null && todayMin != null) text += `Tagesspanne: ${Math.round(todayMin)}\u00b0 bis ${Math.round(todayMax)}\u00b0C.`;
  }
  return text;
}

/* ===== CUSTOM HOOKS ===== */
function useDevice() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { isPhone: w < 520, isTablet: w >= 520 && w < 820, isDesktop: w >= 820, width: w };
}

function useClock(tz) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      try {
        setTime(new Date().toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz }));
      } catch { setTime(new Date().toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })); }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [tz]);
  return time;
}

/* ===== TOOLTIP COMPONENT ===== */
function ChartTooltip({ active, payload, label, th }) {
  if (!active || !payload) return null;
  return (
    <div style={{ background: th.card, border: `1px solid ${th.brd}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: th.text }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.stroke, display: "flex", gap: 6 }}>
          <span>{p.name}:</span><span style={{ fontWeight: 600 }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ===== MAIN APP ===== */
export default function App() {
  const device = useDevice();

  // Load settings
  const [settings, setSettings] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY));
      return { lat: s?.lat ?? DEFAULT_LAT, lon: s?.lon ?? DEFAULT_LON, city: s?.city ?? DEFAULT_CITY, tz: s?.tz ?? DEFAULT_TZ, tempUnit: s?.tempUnit ?? "\u00b0C", windUnit: s?.windUnit ?? "km/h", dark: s?.dark ?? true };
    } catch { return { lat: DEFAULT_LAT, lon: DEFAULT_LON, city: DEFAULT_CITY, tz: DEFAULT_TZ, tempUnit: "\u00b0C", windUnit: "km/h", dark: true }; }
  });

  const saveSetting = useCallback((k, v) => {
    setSettings(prev => {
      const n = { ...prev, [k]: v };
      localStorage.setItem(LS_KEY, JSON.stringify(n));
      return n;
    });
  }, []);

  const setLocation = useCallback((lat, lon, city, tz) => {
    setSettings(prev => {
      const n = { ...prev, lat, lon, city, tz: tz || prev.tz };
      localStorage.setItem(LS_KEY, JSON.stringify(n));
      return n;
    });
  }, []);

  const th = settings.dark ? darkTheme : lightTheme;
  const clock = useClock(settings.tz);

  // Tab state
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: "Home", icon: "\uD83C\uDFE0" },
    { label: "Heute", icon: "\u23F0" },
    { label: "16 Tage", icon: "\uD83D\uDCC5" },
    { label: "Mehr", icon: "\u2699\uFE0F" },
  ];

  // Data state
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [archive, setArchive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);

  // Heute state
  const [selectedHour, setSelectedHour] = useState(null);
  const [heuteChartSeries, setHeuteChartSeries] = useState(["Temperatur", "Gef\u00fchlt"]);
  // 16 Tage state
  const [dayView, setDayView] = useState("list");
  const [expandedDay, setExpandedDay] = useState(null);
  const [dayChartSeries, setDayChartSeries] = useState(["Max-Temp", "Min-Temp"]);
  // Mehr state
  const [moreTab, setMoreTab] = useState(0);
  const [chartRange, setChartRange] = useState(7);
  const [detailChartType, setDetailChartType] = useState(0);
  const [detailSeries, setDetailSeries] = useState(["Temperatur"]);

  const moreTabs = ["Charts", "Pollen", "Luftqualit\u00e4t", "Warnungen", "Vergleich"];

  // Fetch data
  const fetchData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    const { lat, lon } = settings;

    // Check cache
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
        if (cached && cached.lat === lat && cached.lon === lon && Date.now() - cached.ts < CACHE_TTL) {
          setWeather(cached.weather);
          setAirQuality(cached.air);
          setArchive(cached.archive);
          setLoading(false);
          return;
        }
      } catch {}
    }

    try {
      const [wRes, aRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,uv_index&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index,surface_pressure,relative_humidity_2m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,sunrise,sunset,daylight_duration,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max&timezone=auto&forecast_days=16`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide&hourly=european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide&forecast_days=5`),
      ]);
      if (!wRes.ok || !aRes.ok) throw new Error("API Fehler");
      const wData = await wRes.json();
      const aData = await aRes.json();

      // Archive (last year same period)
      let archData = null;
      try {
        const now = new Date();
        const lastYear = now.getFullYear() - 1;
        const start = `${lastYear}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
        const endD = new Date(lastYear, now.getMonth()+1, 0);
        const end = `${lastYear}-${String(now.getMonth()+1).padStart(2,'0')}-${String(endD.getDate()).padStart(2,'0')}`;
        const archRes = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto`);
        if (archRes.ok) archData = await archRes.json();
      } catch {}

      setWeather(wData);
      setAirQuality(aData);
      setArchive(archData);

      localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lon, ts: Date.now(), weather: wData, air: aData, archive: archData }));
    } catch (e) {
      setError(e.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [settings.lat, settings.lon]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Search handler
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=de`);
        const data = await res.json();
        setSearchResults(data.results || []);
        setSearchOpen(true);
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // GPS
  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation(pos.coords.latitude, pos.coords.longitude, "Mein Standort", DEFAULT_TZ); },
      () => {}
    );
  }, [setLocation]);

  // Computed data
  const todayHourly = useMemo(() => {
    if (!weather?.hourly) return [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const hours = [];
    weather.hourly.time.forEach((t, i) => {
      if (t.startsWith(todayStr)) {
        hours.push({
          time: t, hour: new Date(t).getHours(),
          temp: weather.hourly.temperature_2m[i],
          feels: weather.hourly.apparent_temperature[i],
          rainProb: weather.hourly.precipitation_probability[i],
          rain: weather.hourly.precipitation[i],
          code: weather.hourly.weather_code[i],
          wind: weather.hourly.wind_speed_10m[i],
          gusts: weather.hourly.wind_gusts_10m[i],
          uv: weather.hourly.uv_index[i],
          pressure: weather.hourly.surface_pressure[i],
          humidity: weather.hourly.relative_humidity_2m[i],
          windDir: weather.hourly.wind_direction_10m[i],
        });
      }
    });
    return hours;
  }, [weather]);

  const next24 = useMemo(() => {
    if (!weather?.hourly) return [];
    const now = Date.now();
    const hours = [];
    weather.hourly.time.forEach((t, i) => {
      const ts = new Date(t).getTime();
      if (ts >= now && hours.length < 24) {
        hours.push({
          time: t, hour: new Date(t).getHours(),
          temp: weather.hourly.temperature_2m[i],
          feels: weather.hourly.apparent_temperature[i],
          rainProb: weather.hourly.precipitation_probability[i],
          rain: weather.hourly.precipitation[i],
          code: weather.hourly.weather_code[i],
          wind: weather.hourly.wind_speed_10m[i],
          gusts: weather.hourly.wind_gusts_10m[i],
          uv: weather.hourly.uv_index[i],
          pressure: weather.hourly.surface_pressure[i],
          humidity: weather.hourly.relative_humidity_2m[i],
          windDir: weather.hourly.wind_direction_10m[i],
        });
      }
    });
    return hours;
  }, [weather]);

  const nextRain = useMemo(() => {
    if (!next24.length) return null;
    const h = next24.find(h => h.rainProb > 30);
    return h ? `${String(h.hour).padStart(2,'0')}:00 (${h.rainProb}%)` : "Kein Regen";
  }, [next24]);

  const currentPollen = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const hour = now.getHours();
    const types = [
      { key: "birch", name: "Birke", icon: "\uD83C\uDF33" },
      { key: "grass", name: "Gras", icon: "\uD83C\uDF3F" },
      { key: "alder", name: "Erle", icon: "\uD83C\uDF32" },
      { key: "mugwort", name: "Beifu\u00df", icon: "\uD83C\uDF3E" },
      { key: "ragweed", name: "Ragweed", icon: "\uD83C\uDF3B" },
      { key: "olive", name: "Olive", icon: "\uD83C\uDF43" },
    ];
    return types.map(t => {
      const val = getSeasonalLevel(month, hour, t.key);
      const lvl = pollenLvl(val);
      // 5-day forecast
      const forecast = [];
      for (let d = 0; d < 5; d++) {
        const fDate = new Date(now);
        fDate.setDate(fDate.getDate() + d);
        const fVal = getSeasonalLevel(fDate.getMonth() + 1, 12, t.key);
        forecast.push({ day: fDate.toLocaleDateString("de-AT", { weekday: "short" }), value: fVal, level: pollenLvl(fVal) });
      }
      return { ...t, value: val, level: lvl, forecast };
    });
  }, []);

  const maxPollenLevel = useMemo(() => {
    return currentPollen.reduce((max, p) => p.level.n > max ? p.level.n : max, 0);
  }, [currentPollen]);

  const alerts = useMemo(() => generateAlerts(weather, airQuality), [weather, airQuality]);

  // Toggle chart series helper
  const toggleSeries = (series, setSeries, name) => {
    setSeries(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  };

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="app" style={{ background: th.bg, color: th.text }}>
        <div className="loading-wrap">
          <div className="spinner" style={{ borderColor: th.brd, borderTopColor: th.ac }} />
          <div style={{ fontSize: 14 }}>Wetterdaten werden geladen...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app" style={{ background: th.bg, color: th.text }}>
        <div className="error-wrap">
          <div style={{ fontSize: 48 }}>{"\u26A0\uFE0F"}</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Fehler: {error}</div>
          <button className="retry-btn" style={{ background: th.ac, color: "#fff" }} onClick={() => fetchData(true)}>Erneut versuchen</button>
        </div>
      </div>
    );
  }

  const cur = weather?.current;
  const curW = getW(cur?.weather_code);
  const curComfort = getComfort(cur?.temperature_2m, cur?.relative_humidity_2m, cur?.wind_speed_10m);
  const curScore = getScore(cur?.weather_code, cur?.temperature_2m, cur?.wind_speed_10m, cur?.uv_index);
  const curClothing = getClothing(cur?.temperature_2m ?? 15, cur?.weather_code ?? 0, cur?.uv_index ?? 0, cur?.wind_speed_10m ?? 0);
  const curMoon = moonPhase(new Date());

  const heuteChartData = todayHourly.map(h => ({
    name: `${String(h.hour).padStart(2,'0')}:00`,
    Temperatur: h.temp, "Gef\u00fchlt": h.feels, Wind: h.wind, "B\u00f6en": h.gusts,
    "Regen%": h.rainProb, UV: h.uv, Feuchtigkeit: h.humidity, Druck: h.pressure,
  }));

  const heuteSeriesConfig = [
    { key: "Temperatur", color: "#ef4444" }, { key: "Gef\u00fchlt", color: "#f97316" },
    { key: "Wind", color: "#3b82f6" }, { key: "B\u00f6en", color: "#60a5fa" },
    { key: "Regen%", color: "#06b6d4" }, { key: "UV", color: "#a855f7" },
    { key: "Feuchtigkeit", color: "#14b8a6" }, { key: "Druck", color: "#6366f1" },
  ];

  return (
    <div className="app" style={{ background: th.bg, color: th.text }}>
      {/* ===== TOP BAR ===== */}
      <div className="app-inner">
        <div className="top-bar" style={{ borderColor: th.brd, background: settings.dark ? 'rgba(15,17,23,0.85)' : 'rgba(240,244,248,0.85)' }}>
          <div className="app-title" style={{ color: th.ac }}>{"\uD83C\uDF24\uFE0F"} Wetter-Zentrale</div>
          <div className="top-bar-spacer" />
          <div className="search-wrap">
            <input
              className="search-input"
              style={{ background: th.card, borderColor: th.brd, color: th.text }}
              placeholder="Ort suchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="search-results" style={{ background: th.card, borderColor: th.brd }}>
                {searchResults.map((r, i) => (
                  <div key={i} className="search-item" style={{ color: th.text, borderBottom: `1px solid ${th.brd}` }}
                    onClick={() => { setLocation(r.latitude, r.longitude, r.name, r.timezone); setSearchQuery(""); setSearchOpen(false); setSearchResults([]); setTimeout(() => fetchData(true), 100); }}>
                    {r.name}{r.admin1 ? `, ${r.admin1}` : ""}{r.country ? ` (${r.country})` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="icon-btn" style={{ background: th.acs }} onClick={handleGPS} title="GPS">{"\uD83D\uDCCD"}</button>
          <div className="toggle-group" style={{ borderColor: th.brd }}>
            <button className={`toggle-btn ${settings.tempUnit === "\u00b0C" ? "active" : ""}`}
              style={{ background: settings.tempUnit === "\u00b0C" ? th.ac : th.card, color: settings.tempUnit === "\u00b0C" ? "#fff" : th.ts }}
              onClick={() => saveSetting("tempUnit", "\u00b0C")}>{"\u00b0C"}</button>
            <button className={`toggle-btn ${settings.tempUnit === "\u00b0F" ? "active" : ""}`}
              style={{ background: settings.tempUnit === "\u00b0F" ? th.ac : th.card, color: settings.tempUnit === "\u00b0F" ? "#fff" : th.ts }}
              onClick={() => saveSetting("tempUnit", "\u00b0F")}>{"\u00b0F"}</button>
          </div>
          <div className="toggle-group" style={{ borderColor: th.brd }}>
            <button className={`toggle-btn ${settings.windUnit === "km/h" ? "active" : ""}`}
              style={{ background: settings.windUnit === "km/h" ? th.ac : th.card, color: settings.windUnit === "km/h" ? "#fff" : th.ts }}
              onClick={() => saveSetting("windUnit", "km/h")}>km/h</button>
            <button className={`toggle-btn ${settings.windUnit === "m/s" ? "active" : ""}`}
              style={{ background: settings.windUnit === "m/s" ? th.ac : th.card, color: settings.windUnit === "m/s" ? "#fff" : th.ts }}
              onClick={() => saveSetting("windUnit", "m/s")}>m/s</button>
          </div>
          <button className="icon-btn" style={{ background: th.acs, fontSize: 18 }}
            onClick={() => saveSetting("dark", !settings.dark)}>
            {settings.dark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
          </button>
        </div>

        {/* Clock */}
        <div className="clock-bar" style={{ color: th.ts }}>
          {"\uD83D\uDCCD"} {settings.city} \u2022 {clock}
        </div>

        {/* Refresh */}
        <div style={{ textAlign: "right", marginBottom: 4 }}>
          <button className="refresh-btn" style={{ background: th.acs, color: th.ac, border: `1px solid ${th.brd}` }}
            onClick={() => fetchData(true)}>{"\uD83D\uDD04"} Aktualisieren</button>
        </div>

        {/* ===== TAB CONTENT ===== */}
        {tab === 0 && <HomeTab cur={cur} curW={curW} curComfort={curComfort} curScore={curScore} curClothing={curClothing} curMoon={curMoon} weather={weather} nextRain={nextRain} maxPollenLevel={maxPollenLevel} airQuality={airQuality} alerts={alerts} th={th} settings={settings} />}
        {tab === 1 && <HeuteTab todayHourly={todayHourly} selectedHour={selectedHour} setSelectedHour={setSelectedHour} heuteChartData={heuteChartData} heuteChartSeries={heuteChartSeries} setHeuteChartSeries={setHeuteChartSeries} heuteSeriesConfig={heuteSeriesConfig} th={th} settings={settings} device={device} />}
        {tab === 2 && <SechzehnTageTab weather={weather} dayView={dayView} setDayView={setDayView} expandedDay={expandedDay} setExpandedDay={setExpandedDay} dayChartSeries={dayChartSeries} setDayChartSeries={setDayChartSeries} th={th} settings={settings} device={device} />}
        {tab === 3 && <MehrTab weather={weather} airQuality={airQuality} archive={archive} currentPollen={currentPollen} alerts={alerts} moreTab={moreTab} setMoreTab={setMoreTab} chartRange={chartRange} setChartRange={setChartRange} detailChartType={detailChartType} setDetailChartType={setDetailChartType} detailSeries={detailSeries} setDetailSeries={setDetailSeries} moreTabs={moreTabs} th={th} settings={settings} device={device} />}
      </div>

      {/* ===== TAB BAR ===== */}
      <div className="tab-bar" style={{ background: settings.dark ? "rgba(15,17,23,0.9)" : "rgba(240,244,248,0.9)", borderColor: th.brd }}>
        <div className="tab-bar-inner">
          {tabs.map((t, i) => (
            <button key={i} className={`tab-btn ${tab === i ? "active" : ""}`}
              style={{ color: tab === i ? th.ac : th.ts }}
              onClick={() => setTab(i)}>
              <span className="tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===== HOME TAB ===== */
function HomeTab({ cur, curW, curComfort, curScore, curClothing, curMoon, weather, nextRain, maxPollenLevel, airQuality, alerts, th, settings }) {
  if (!cur) return null;
  const sunrise = weather?.daily?.sunrise?.[0];
  const sunset = weather?.daily?.sunset?.[0];
  const pollenLabels = ["Keine", "Gering", "M\u00e4\u00dfig", "Hoch", "Sehr hoch"];

  return (
    <>
      {/* Hero Card */}
      <div className="hero-card card" style={{ background: th.heroGrad, border: `1px solid ${th.brd}` }}>
        <div className="hero-main">
          <div className="hero-icon">{curW.icon}</div>
          <div>
            <div className="hero-temp" style={{ color: th.text }}>{convertTemp(cur.temperature_2m, settings.tempUnit)}{settings.tempUnit}</div>
            <div className="hero-feels" style={{ color: th.ts }}>Gef\u00fchlt {convertTemp(cur.apparent_temperature, settings.tempUnit)}{settings.tempUnit}</div>
            <div className="hero-label" style={{ color: th.text }}>{curW.label}</div>
          </div>
        </div>
        <div className="hero-details">
          <div className="hero-detail"><span className="hero-detail-icon">{"\uD83D\uDCA8"}</span> {convertWind(cur.wind_speed_10m, settings.windUnit)} {settings.windUnit} {windDir(cur.wind_direction_10m)}</div>
          <div className="hero-detail"><span className="hero-detail-icon">{"\uD83D\uDCA7"}</span> {cur.relative_humidity_2m}%</div>
          <div className="hero-detail"><span className="hero-detail-icon">{"\uD83C\uDF21\uFE0F"}</span> {Math.round(cur.surface_pressure)} hPa</div>
          <div className="hero-detail"><span className="hero-detail-icon">{"\u2600\uFE0F"}</span> UV {Math.round(cur.uv_index)}</div>
          <div className="hero-detail"><span className="hero-detail-icon">{"\uD83C\uDF05"}</span> {sunrise ? fmtTime(sunrise) : "\u2013"}</div>
          <div className="hero-detail"><span className="hero-detail-icon">{"\uD83C\uDF07"}</span> {sunset ? fmtTime(sunset) : "\u2013"}</div>
          <div className="hero-detail"><span className="hero-detail-icon">{curMoon.i}</span> {curMoon.l}</div>
          <div className="hero-detail"><span className="hero-detail-icon">{curComfort.emoji}</span> <span style={{ color: curComfort.color }}>{curComfort.label}</span></div>
          <div className="hero-detail"><span className="hero-detail-icon">{"\u2B50"}</span> Score: <span style={{ fontWeight: 700, color: curScore >= 7 ? "#22c55e" : curScore >= 4 ? "#eab308" : "#ef4444" }}>{curScore}/10</span></div>
        </div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>{"\uD83D\uDC55"} {curClothing}</div>
      </div>

      {/* Mini Status Cards */}
      <div className="mini-cards">
        <div className="mini-card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="mini-card-icon">{"\uD83C\uDF27\uFE0F"}</div>
          <div className="mini-card-label" style={{ color: th.ts }}>N\u00e4chster Regen</div>
          <div className="mini-card-value">{nextRain}</div>
        </div>
        <div className="mini-card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="mini-card-icon">{"\uD83C\uDF3C"}</div>
          <div className="mini-card-label" style={{ color: th.ts }}>Pollen</div>
          <div className="mini-card-value">{pollenLabels[maxPollenLevel] || "Keine"}</div>
        </div>
        <div className="mini-card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="mini-card-icon">{"\uD83D\uDE37"}</div>
          <div className="mini-card-label" style={{ color: th.ts }}>Luftqualit\u00e4t</div>
          <div className="mini-card-value" style={{ color: aqiLevel(airQuality?.current?.european_aqi).c }}>{aqiLevel(airQuality?.current?.european_aqi).l}</div>
        </div>
        <div className="mini-card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="mini-card-icon">{"\u26A0\uFE0F"}</div>
          <div className="mini-card-label" style={{ color: th.ts }}>Warnungen</div>
          <div className="mini-card-value" style={{ color: alerts.length > 0 ? th.dTx : "#22c55e" }}>{alerts.length}</div>
        </div>
      </div>

      {/* Expert Text */}
      <div className="expert-card" style={{ background: th.card, borderColor: th.brd }}>
        <div className="expert-title">{"\uD83E\uDDD1\u200D\uD83C\uDF93"} Experteneinsch\u00e4tzung</div>
        <div className="expert-text" style={{ color: th.ts }}>{generateExpertText(weather)}</div>
      </div>
    </>
  );
}

/* ===== HEUTE TAB ===== */
function HeuteTab({ todayHourly, selectedHour, setSelectedHour, heuteChartData, heuteChartSeries, setHeuteChartSeries, heuteSeriesConfig, th, settings, device }) {
  const selData = selectedHour != null ? todayHourly[selectedHour] : null;

  return (
    <>
      <div className="section-title">{"\u23F0"} Stundenvorhersage</div>
      {/* Hour Cards */}
      <div className="hour-scroll">
        {todayHourly.map((h, i) => {
          const w = getW(h.code);
          return (
            <div key={i} className={`hour-card ${selectedHour === i ? "selected" : ""}`}
              style={{ background: th.card, borderColor: selectedHour === i ? th.ac : "transparent" }}
              onClick={() => setSelectedHour(selectedHour === i ? null : i)}>
              <div className="hour-time" style={{ color: th.ts }}>{String(h.hour).padStart(2,'0')}:00</div>
              <div className="hour-icon">{w.icon}</div>
              <div className="hour-temp">{convertTemp(h.temp, settings.tempUnit)}{"\u00b0"}</div>
              <div className="hour-rain" style={{ color: th.ts }}>{"\uD83C\uDF27\uFE0F"} {h.rainProb}%</div>
            </div>
          );
        })}
      </div>

      {/* Hour Detail Panel */}
      {selData && (
        <div className="hour-detail" style={{ background: th.card, borderColor: th.ac }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>{String(selData.hour).padStart(2,'0')}:00 - {getW(selData.code).label}</div>
          <div className="hour-detail-grid">
            <div className="hour-detail-item"><div className="hour-detail-label">Temperatur</div>{convertTemp(selData.temp, settings.tempUnit)}{settings.tempUnit}</div>
            <div className="hour-detail-item"><div className="hour-detail-label">Gef\u00fchlt</div>{convertTemp(selData.feels, settings.tempUnit)}{settings.tempUnit}</div>
            <div className="hour-detail-item"><div className="hour-detail-label">Wind</div>{convertWind(selData.wind, settings.windUnit)} {settings.windUnit}</div>
            <div className="hour-detail-item"><div className="hour-detail-label">B\u00f6en</div>{convertWind(selData.gusts, settings.windUnit)} {settings.windUnit}</div>
            <div className="hour-detail-item"><div className="hour-detail-label">Regen%</div>{selData.rainProb}%</div>
            <div className="hour-detail-item"><div className="hour-detail-label">Niederschlag</div>{selData.rain?.toFixed(1)} mm</div>
            <div className="hour-detail-item"><div className="hour-detail-label">UV</div>{Math.round(selData.uv)}</div>
            <div className="hour-detail-item"><div className="hour-detail-label">Feuchtigkeit</div>{selData.humidity}%</div>
            <div className="hour-detail-item"><div className="hour-detail-label">Druck</div>{Math.round(selData.pressure)} hPa</div>
            <div className="hour-detail-item"><div className="hour-detail-label">Windrichtung</div>{windDir(selData.windDir)}</div>
          </div>
        </div>
      )}

      {/* Rain Probability Bars - ALL 24 hours */}
      <div className="rain-bars-wrap card" style={{ background: th.card, borderColor: th.brd }}>
        <div className="rain-bars-title">{"\uD83C\uDF27\uFE0F"} Regenwahrscheinlichkeit (24h)</div>
        <div className="rain-bars-scroll">
          <div className="rain-bars-inner">
            {todayHourly.map((h, i) => (
              <div key={i} className="rain-bar-col">
                <div className="rain-bar-value" style={{ color: th.ts }}>{h.rainProb}%</div>
                <div className="rain-bar-track" style={{ background: th.acs }}>
                  <div className="rain-bar-fill" style={{ height: `${h.rainProb}%`, background: h.rainProb > 60 ? "#3b82f6" : h.rainProb > 30 ? "#06b6d4" : "#94a3b8" }} />
                </div>
                <div className="rain-bar-time" style={{ color: th.ts }}>{String(h.hour).padStart(2,'0')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-series chart */}
      <div className="chart-container card" style={{ background: th.card, borderColor: th.brd }}>
        <div className="chart-title">{"\uD83D\uDCC8"} Tagesverlauf</div>
        <div className="chart-toggles">
          {heuteSeriesConfig.map(s => (
            <button key={s.key} className={`chart-toggle ${heuteChartSeries.includes(s.key) ? "active" : ""}`}
              style={{ borderColor: s.color, background: heuteChartSeries.includes(s.key) ? s.color : "transparent", color: heuteChartSeries.includes(s.key) ? "#fff" : s.color }}
              onClick={() => toggleSeries(heuteChartSeries, setHeuteChartSeries, s.key)}>{s.key}</button>
          ))}
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={heuteChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={th.brd} />
              <XAxis dataKey="name" tick={{ fill: th.ts, fontSize: 11 }} interval={device.isPhone ? 3 : 1} />
              <YAxis tick={{ fill: th.ts, fontSize: 11 }} />
              <Tooltip content={<ChartTooltip th={th} />} />
              <Legend />
              {heuteSeriesConfig.filter(s => heuteChartSeries.includes(s.key)).map(s => (
                <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full Day Overview */}
      <div className="section-title">{"\uD83D\uDCCB"} Tages\u00fcbersicht</div>
      <div className="card" style={{ background: th.card, borderColor: th.brd }}>
        {todayHourly.map((h, i) => (
          <div key={i} className="day-overview-item" style={{ borderColor: th.brd }}>
            <div className="day-overview-time">{String(h.hour).padStart(2,'0')}:00</div>
            <div className="day-overview-icon">{getW(h.code).icon}</div>
            <div className="day-overview-temp">{convertTemp(h.temp, settings.tempUnit)}{"\u00b0"}</div>
            <div className="day-overview-details" style={{ color: th.ts }}>
              {"\uD83D\uDCA8"}{convertWind(h.wind, settings.windUnit)} {"\uD83C\uDF27\uFE0F"}{h.rainProb}% {"\u2600\uFE0F"}UV{Math.round(h.uv)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ===== 16 TAGE TAB ===== */
function SechzehnTageTab({ weather, dayView, setDayView, expandedDay, setExpandedDay, dayChartSeries, setDayChartSeries, th, settings, device }) {
  if (!weather?.daily) return null;
  const d = weather.daily;
  const days = d.time.map((t, i) => ({
    date: t, fmtDate: fmtDate(t),
    maxTemp: d.temperature_2m_max[i], minTemp: d.temperature_2m_min[i],
    code: d.weather_code[i], rain: d.precipitation_sum[i],
    rainProb: d.precipitation_probability_max[i],
    wind: d.wind_speed_10m_max[i], gusts: d.wind_gusts_10m_max[i],
    uv: d.uv_index_max[i], sunrise: d.sunrise[i], sunset: d.sunset[i],
    daylight: d.daylight_duration[i],
    apparentMax: d.apparent_temperature_max[i],
    score: getScore(d.weather_code[i], d.temperature_2m_max[i], d.wind_speed_10m_max[i], d.uv_index_max[i]),
  }));

  const avgMax = (days.reduce((s, d) => s + d.maxTemp, 0) / days.length).toFixed(1);
  const avgMin = (days.reduce((s, d) => s + d.minTemp, 0) / days.length).toFixed(1);
  const totalRain = days.reduce((s, d) => s + (d.rain || 0), 0).toFixed(1);
  const maxGusts = Math.max(...days.map(d => d.gusts || 0));
  const rainDays = days.filter(d => (d.rain || 0) > 0.1).length;
  const avgScore = (days.reduce((s, d) => s + d.score, 0) / days.length).toFixed(1);

  const chartData = days.map(day => ({
    name: day.fmtDate,
    "Max-Temp": day.maxTemp, "Min-Temp": day.minTemp,
    Niederschlag: day.rain, Wind: day.wind, "B\u00f6en": day.gusts,
    UV: day.uv, "Regen%": day.rainProb,
  }));

  const daySeriesConfig = [
    { key: "Max-Temp", color: "#ef4444", type: "line" }, { key: "Min-Temp", color: "#3b82f6", type: "line" },
    { key: "Niederschlag", color: "#06b6d4", type: "bar" }, { key: "Wind", color: "#8b5cf6", type: "line" },
    { key: "B\u00f6en", color: "#a855f7", type: "line" }, { key: "UV", color: "#f59e0b", type: "line" },
    { key: "Regen%", color: "#14b8a6", type: "line" },
  ];

  return (
    <>
      <div className="section-title">{"\uD83D\uDCC5"} 16-Tage-Vorhersage</div>
      {/* Summary */}
      <div className="summary-cards">
        <div className="summary-card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="summary-value" style={{ color: "#ef4444" }}>{convertTemp(parseFloat(avgMax), settings.tempUnit)}{"\u00b0"}</div>
          <div className="summary-label" style={{ color: th.ts }}>{"\u00d8"} Max</div>
        </div>
        <div className="summary-card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="summary-value" style={{ color: "#3b82f6" }}>{convertTemp(parseFloat(avgMin), settings.tempUnit)}{"\u00b0"}</div>
          <div className="summary-label" style={{ color: th.ts }}>{"\u00d8"} Min</div>
        </div>
        <div className="summary-card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="summary-value" style={{ color: "#06b6d4" }}>{totalRain}mm</div>
          <div className="summary-label" style={{ color: th.ts }}>Regen ges.</div>
        </div>
        <div className="summary-card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="summary-value" style={{ color: "#8b5cf6" }}>{Math.round(maxGusts)}</div>
          <div className="summary-label" style={{ color: th.ts }}>Max B\u00f6en</div>
        </div>
        <div className="summary-card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="summary-value" style={{ color: "#14b8a6" }}>{rainDays}</div>
          <div className="summary-label" style={{ color: th.ts }}>Regentage</div>
        </div>
        <div className="summary-card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="summary-value" style={{ color: "#f59e0b" }}>{avgScore}</div>
          <div className="summary-label" style={{ color: th.ts }}>{"\u00d8"} Score</div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button className="view-btn" style={{ background: dayView === "list" ? th.ac : th.card, color: dayView === "list" ? "#fff" : th.ts, borderColor: th.brd }}
          onClick={() => setDayView("list")}>{"\uD83D\uDCCB"} Liste</button>
        <button className="view-btn" style={{ background: dayView === "chart" ? th.ac : th.card, color: dayView === "chart" ? "#fff" : th.ts, borderColor: th.brd }}
          onClick={() => setDayView("chart")}>{"\uD83D\uDCC8"} Chart</button>
      </div>

      {dayView === "chart" && (
        <div className="chart-container card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="chart-toggles">
            {daySeriesConfig.map(s => (
              <button key={s.key} className={`chart-toggle ${dayChartSeries.includes(s.key) ? "active" : ""}`}
                style={{ borderColor: s.color, background: dayChartSeries.includes(s.key) ? s.color : "transparent", color: dayChartSeries.includes(s.key) ? "#fff" : s.color }}
                onClick={() => toggleSeries(dayChartSeries, setDayChartSeries, s.key)}>{s.key}</button>
            ))}
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={th.brd} />
                <XAxis dataKey="name" tick={{ fill: th.ts, fontSize: 11 }} angle={-45} textAnchor="end" height={60} interval={device.isPhone ? 2 : 0} />
                <YAxis tick={{ fill: th.ts, fontSize: 11 }} />
                <Tooltip content={<ChartTooltip th={th} />} />
                <Legend />
                {daySeriesConfig.filter(s => dayChartSeries.includes(s.key)).map(s =>
                  s.type === "bar" ? <Bar key={s.key} dataKey={s.key} fill={s.color} opacity={0.7} /> :
                    <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {dayView === "list" && days.map((day, i) => {
        const w = getW(day.code);
        const moon = moonPhase(day.date);
        const expanded = expandedDay === i;
        return (
          <div key={i} className="day-card" style={{ background: th.card, borderColor: th.brd }}
            onClick={() => setExpandedDay(expanded ? null : i)}>
            <div className="day-card-header">
              <div className="day-card-date">{day.fmtDate}</div>
              <div className="day-card-icon">{w.icon}</div>
              <div className="day-card-temps">
                <span style={{ color: "#ef4444" }}>{convertTemp(day.maxTemp, settings.tempUnit)}{"\u00b0"}</span>
                {" / "}
                <span style={{ color: "#3b82f6" }}>{convertTemp(day.minTemp, settings.tempUnit)}{"\u00b0"}</span>
              </div>
              <div className="day-card-rain" style={{ color: th.ts }}>{"\uD83C\uDF27\uFE0F"}{day.rain?.toFixed(1)}mm</div>
              <div className="day-card-score" style={{ color: day.score >= 7 ? "#22c55e" : day.score >= 4 ? "#eab308" : "#ef4444" }}>{day.score}/10</div>
            </div>
            {expanded && (
              <div className="day-card-expand" style={{ borderColor: th.brd }}>
                <div><div className="day-card-expand-label">Niederschlag</div>{day.rain?.toFixed(1)} mm ({day.rainProb}%)</div>
                <div><div className="day-card-expand-label">Wind / B\u00f6en</div>{convertWind(day.wind, settings.windUnit)} / {convertWind(day.gusts, settings.windUnit)} {settings.windUnit}</div>
                <div><div className="day-card-expand-label">UV-Index</div>{Math.round(day.uv)}</div>
                <div><div className="day-card-expand-label">Mond</div>{moon.i} {moon.l}</div>
                <div><div className="day-card-expand-label">Sonnenaufgang</div>{day.sunrise ? fmtTime(day.sunrise) : "\u2013"}</div>
                <div><div className="day-card-expand-label">Sonnenuntergang</div>{day.sunset ? fmtTime(day.sunset) : "\u2013"}</div>
                <div><div className="day-card-expand-label">Tageslicht</div>{day.daylight ? (day.daylight / 3600).toFixed(1) + "h" : "\u2013"}</div>
                <div><div className="day-card-expand-label">Kleidung</div>{getClothing(day.maxTemp, day.code, day.uv, day.wind)}</div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ===== MEHR TAB ===== */
function MehrTab({ weather, airQuality, archive, currentPollen, alerts, moreTab, setMoreTab, chartRange, setChartRange, detailChartType, setDetailChartType, detailSeries, setDetailSeries, moreTabs, th, settings, device }) {
  return (
    <>
      <div className="sub-tabs">
        {moreTabs.map((t, i) => (
          <button key={i} className={`sub-tab ${moreTab === i ? "active" : ""}`}
            style={{ borderColor: th.ac, background: moreTab === i ? th.ac : "transparent", color: moreTab === i ? "#fff" : th.ac }}
            onClick={() => setMoreTab(i)}>{t}</button>
        ))}
      </div>

      {moreTab === 0 && <DetailCharts weather={weather} chartRange={chartRange} setChartRange={setChartRange} detailChartType={detailChartType} setDetailChartType={setDetailChartType} detailSeries={detailSeries} setDetailSeries={setDetailSeries} th={th} settings={settings} device={device} />}
      {moreTab === 1 && <PollenSection currentPollen={currentPollen} th={th} />}
      {moreTab === 2 && <AirQualitySection airQuality={airQuality} th={th} device={device} />}
      {moreTab === 3 && <WarningsSection alerts={alerts} th={th} />}
      {moreTab === 4 && <ComparisonSection weather={weather} archive={archive} th={th} settings={settings} device={device} />}
    </>
  );
}

/* ===== DETAIL CHARTS ===== */
function DetailCharts({ weather, chartRange, setChartRange, detailChartType, setDetailChartType, detailSeries, setDetailSeries, th, settings, device }) {
  if (!weather?.hourly) return null;

  const chartTypes = [
    { name: "Temperatur", series: [{ key: "Temp", color: "#ef4444" }, { key: "Gef\u00fchlt", color: "#f97316" }] },
    { name: "Niederschlag", series: [{ key: "Regen mm", color: "#3b82f6" }, { key: "Regen%", color: "#06b6d4" }] },
    { name: "Wind", series: [{ key: "Wind", color: "#8b5cf6" }, { key: "B\u00f6en", color: "#a855f7" }] },
    { name: "Druck", series: [{ key: "Druck hPa", color: "#6366f1" }] },
  ];

  const ct = chartTypes[detailChartType];
  const maxHours = chartRange * 24;
  const data = weather.hourly.time.slice(0, maxHours).map((t, i) => ({
    name: new Date(t).toLocaleDateString("de-AT", { day: "numeric", month: "short" }) + " " + String(new Date(t).getHours()).padStart(2, '0') + "h",
    Temp: weather.hourly.temperature_2m[i],
    "Gef\u00fchlt": weather.hourly.apparent_temperature[i],
    "Regen mm": weather.hourly.precipitation[i],
    "Regen%": weather.hourly.precipitation_probability[i],
    Wind: weather.hourly.wind_speed_10m[i],
    "B\u00f6en": weather.hourly.wind_gusts_10m[i],
    "Druck hPa": weather.hourly.surface_pressure[i],
  }));

  return (
    <>
      <div className="section-title">{"\uD83D\uDCC8"} Detailcharts</div>
      {/* Chart type selector */}
      <div className="chart-toggles" style={{ marginBottom: 10 }}>
        {chartTypes.map((c, i) => (
          <button key={i} className={`chart-toggle ${detailChartType === i ? "active" : ""}`}
            style={{ borderColor: th.ac, background: detailChartType === i ? th.ac : "transparent", color: detailChartType === i ? "#fff" : th.ac }}
            onClick={() => { setDetailChartType(i); setDetailSeries(chartTypes[i].series.map(s => s.key)); }}>{c.name}</button>
        ))}
      </div>
      {/* Range selector */}
      <div className="range-selector">
        {[7, 10, 14, 16].map(r => (
          <button key={r} className="range-btn" style={{ background: chartRange === r ? th.ac : th.card, color: chartRange === r ? "#fff" : th.ts, borderColor: th.brd }}
            onClick={() => setChartRange(r)}>{r} Tage</button>
        ))}
      </div>
      {/* Series toggles */}
      <div className="chart-toggles">
        {ct.series.map(s => (
          <button key={s.key} className={`chart-toggle ${detailSeries.includes(s.key) ? "active" : ""}`}
            style={{ borderColor: s.color, background: detailSeries.includes(s.key) ? s.color : "transparent", color: detailSeries.includes(s.key) ? "#fff" : s.color }}
            onClick={() => toggleSeries(detailSeries, setDetailSeries, s.key)}>{s.key}</button>
        ))}
      </div>
      <div className="card" style={{ background: th.card, borderColor: th.brd }}>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={th.brd} />
              <XAxis dataKey="name" tick={{ fill: th.ts, fontSize: 10 }} interval={Math.max(1, Math.floor(data.length / (device.isPhone ? 6 : 12)))} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fill: th.ts, fontSize: 11 }} />
              <Tooltip content={<ChartTooltip th={th} />} />
              <Legend />
              {ct.series.filter(s => detailSeries.includes(s.key)).map(s =>
                s.key.includes("mm") ? <Bar key={s.key} dataKey={s.key} fill={s.color} opacity={0.7} /> :
                  <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

/* ===== POLLEN ===== */
function PollenSection({ currentPollen, th }) {
  const [expandedPollen, setExpandedPollen] = useState(null);
  return (
    <>
      <div className="section-title">{"\uD83C\uDF3C"} Pollenflug</div>
      {currentPollen.map((p, i) => {
        const expanded = expandedPollen === i;
        return (
          <div key={i} className="pollen-card" style={{ background: th.card, borderColor: th.brd }}>
            <div className="pollen-header" onClick={() => setExpandedPollen(expanded ? null : i)}>
              <div className="pollen-icon">{p.icon}</div>
              <div className="pollen-name">{p.name}</div>
              <span className="pollen-badge" style={{ background: p.level.c + '22', color: p.level.c }}>{p.level.l}</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.5, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>{"\u25BC"}</span>
            </div>
            {expanded && (
              <div className="pollen-expand" style={{ borderColor: th.brd }}>
                <div style={{ fontSize: '0.78rem', color: th.ts, marginBottom: 8 }}>7-Tage-Vorhersage</div>
                <div className="pollen-forecast">
                  {p.forecast.map((f, j) => (
                    <div key={j} className="pollen-forecast-day">
                      <div className="pollen-forecast-day-label" style={{ color: th.ts }}>{f.day}</div>
                      <div className="pollen-forecast-bar" style={{ background: th.acs }}>
                        <div className="pollen-forecast-bar-fill" style={{ height: `${Math.min(100, f.value / 0.6)}%`, background: f.level.c }} />
                      </div>
                      <div className="pollen-forecast-level" style={{ color: f.level.c }}>{f.level.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ===== AIR QUALITY ===== */
function AirQualitySection({ airQuality, th, device }) {
  if (!airQuality?.current) return <div style={{ padding: 20, textAlign: "center" }}>Keine Luftqualit\u00e4tsdaten verf\u00fcgbar</div>;
  const cur = airQuality.current;
  const aqi = aqiLevel(cur.european_aqi);

  const pollutants = [
    { name: "PM10", value: cur.pm10, level: pmLevel(cur.pm10, "pm10"), max: 100 },
    { name: "PM2.5", value: cur.pm2_5, level: pmLevel(cur.pm2_5, "pm25"), max: 50 },
    { name: "NO\u2082", value: cur.nitrogen_dioxide, level: gasLevel(cur.nitrogen_dioxide, "no2"), max: 230 },
    { name: "O\u2083", value: cur.ozone, level: gasLevel(cur.ozone, "o3"), max: 240 },
    { name: "SO\u2082", value: cur.sulphur_dioxide, level: gasLevel(cur.sulphur_dioxide, "so2"), max: 500 },
    { name: "CO", value: cur.carbon_monoxide, level: gasLevel(cur.carbon_monoxide, "co"), max: 15400 },
  ];

  // 5-day AQI trend
  const trendData = airQuality.hourly ? airQuality.hourly.time.filter((_, i) => i % 6 === 0).map((t, i) => ({
    name: new Date(t).toLocaleDateString("de-AT", { day: "numeric", month: "short" }),
    AQI: airQuality.hourly.european_aqi[i * 6],
  })) : [];

  const tips = [];
  if (cur.european_aqi <= 40) tips.push({ icon: "\u2705", text: "Gute Bedingungen f\u00fcr Outdoor-Aktivit\u00e4ten." });
  if (cur.european_aqi > 40 && cur.european_aqi <= 60) tips.push({ icon: "\uD83D\uDFE1", text: "Empfindliche Personen sollten Belastung begrenzen." });
  if (cur.european_aqi > 60) tips.push({ icon: "\uD83D\uDD34", text: "Vermeiden Sie k\u00f6rperliche Aktivit\u00e4t im Freien." });
  if (cur.pm2_5 > 25) tips.push({ icon: "\uD83D\uDE37", text: "Feinstaubbelastung erh\u00f6ht \u2013 Maske empfohlen." });
  if (cur.ozone > 100) tips.push({ icon: "\u2600\uFE0F", text: "Ozonwerte erh\u00f6ht \u2013 Mittagssonne meiden." });

  return (
    <>
      <div className="section-title">{"\uD83D\uDE37"} Luftqualit\u00e4t</div>
      <div className="aqi-gauge" style={{ borderColor: aqi.c, background: th.card }}>
        <div className="aqi-value" style={{ color: aqi.c }}>{Math.round(cur.european_aqi)}</div>
        <div className="aqi-label" style={{ color: aqi.c }}>{aqi.l} {aqi.emoji}</div>
        <div style={{ fontSize: '0.82rem', color: th.ts, marginTop: 4 }}>Europ\u00e4ischer Luftqualit\u00e4tsindex</div>
        <div className="aqi-bar" style={{ background: th.acs }}>
          <div className="aqi-bar-fill" style={{ width: `${Math.min(100, cur.european_aqi)}%`, background: aqi.c }} />
        </div>
      </div>

      <div className="section-title" style={{ fontSize: '0.85rem' }}>Schadstoffe</div>
      {pollutants.map((p, i) => (
        <div key={i} className="pollutant-card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="pollutant-name" style={{ color: th.ts }}>{p.name}</div>
          <div className="pollutant-bar" style={{ background: th.acs }}>
            <div className="pollutant-bar-fill" style={{ width: `${Math.min(100, ((p.value || 0) / p.max) * 100)}%`, background: p.level.c }} />
          </div>
          <div className="pollutant-value" style={{ color: p.level.c }}>{p.value != null ? Math.round(p.value) : "\u2013"} \u00b5g/m\u00b3</div>
        </div>
      ))}

      {trendData.length > 0 && (
        <div className="card" style={{ background: th.card, borderColor: th.brd }}>
          <div className="chart-title">{"\uD83D\uDCC8"} AQI-Trend (5 Tage)</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={th.brd} />
                <XAxis dataKey="name" tick={{ fill: th.ts, fontSize: 11 }} interval={Math.floor(trendData.length / 6)} />
                <YAxis tick={{ fill: th.ts, fontSize: 11 }} />
                <Tooltip content={<ChartTooltip th={th} />} />
                <Area type="monotone" dataKey="AQI" stroke={aqi.c} fill={aqi.c} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="aqi-tips card" style={{ background: th.card, borderColor: th.brd }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{"\uD83D\uDCA1"} Tipps</div>
        {tips.map((t, i) => <div key={i} className="aqi-tip" style={{ color: th.ts }}><span>{t.icon}</span> {t.text}</div>)}
      </div>
    </>
  );
}

/* ===== WARNINGS ===== */
function WarningsSection({ alerts, th }) {
  if (!alerts.length) {
    return (
      <div className="no-warnings" style={{ color: "#22c55e" }}>
        <div style={{ fontSize: 48 }}>{"\u2705"}</div>
        <div style={{ fontWeight: 600 }}>Keine Warnungen</div>
        <div style={{ fontSize: 13, color: th.ts }}>Alle Wetterbedingungen sind normal.</div>
      </div>
    );
  }

  const sevStyle = (sev) => {
    if (sev === "danger") return { bg: th.dBg, br: th.dBr, tx: th.dTx };
    if (sev === "warning") return { bg: th.wBg, br: th.wBr, tx: th.wTx };
    return { bg: th.pBg, br: th.pBr, tx: th.pTx };
  };

  return (
    <>
      <div className="section-title">{"\u26A0\uFE0F"} Warnungen ({alerts.length})</div>
      {alerts.map((a, i) => {
        const s = sevStyle(a.severity);
        return (
          <div key={i} className="warning-card" style={{ background: s.bg, borderColor: s.br }}>
            <div className="warning-title" style={{ color: s.tx }}>{a.icon} {a.title}</div>
            <div className="warning-text" style={{ color: th.ts }}>{a.text}</div>
          </div>
        );
      })}
    </>
  );
}

/* ===== COMPARISON ===== */
function ComparisonSection({ weather, archive, th, settings, device }) {
  if (!weather?.daily || !archive?.daily) {
    return <div style={{ padding: 20, textAlign: "center", color: th.ts }}>Keine Archivdaten verf\u00fcgbar f\u00fcr den Vergleich.</div>;
  }

  const curDays = weather.daily.time.slice(0, 16).map((t, i) => ({
    day: new Date(t).getDate(),
    maxTemp: weather.daily.temperature_2m_max[i],
    minTemp: weather.daily.temperature_2m_min[i],
    rain: weather.daily.precipitation_sum[i],
  }));

  const archDays = archive.daily.time.map((t, i) => ({
    day: new Date(t).getDate(),
    maxTemp: archive.daily.temperature_2m_max[i],
    minTemp: archive.daily.temperature_2m_min[i],
    rain: archive.daily.precipitation_sum[i],
  }));

  const tempData = curDays.map(d => {
    const arch = archDays.find(a => a.day === d.day);
    return {
      name: `${d.day}.`,
      "Max (aktuell)": d.maxTemp,
      "Min (aktuell)": d.minTemp,
      "Max (Vorjahr)": arch?.maxTemp,
      "Min (Vorjahr)": arch?.minTemp,
    };
  });

  const rainData = curDays.map(d => {
    const arch = archDays.find(a => a.day === d.day);
    return {
      name: `${d.day}.`,
      "Regen (aktuell)": d.rain,
      "Regen (Vorjahr)": arch?.rain,
    };
  });

  return (
    <>
      <div className="section-title">{"\uD83D\uDCC5"} Jahresvergleich</div>
      <div className="comparison-section card" style={{ background: th.card, borderColor: th.brd }}>
        <div className="comparison-title">Temperaturvergleich</div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={tempData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={th.brd} />
              <XAxis dataKey="name" tick={{ fill: th.ts, fontSize: 11 }} />
              <YAxis tick={{ fill: th.ts, fontSize: 11 }} />
              <Tooltip content={<ChartTooltip th={th} />} />
              <Legend />
              <Line type="monotone" dataKey="Max (aktuell)" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Min (aktuell)" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Max (Vorjahr)" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="Min (Vorjahr)" stroke="#3b82f6" strokeWidth={1} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="comparison-section card" style={{ background: th.card, borderColor: th.brd }}>
        <div className="comparison-title">Niederschlagsvergleich</div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rainData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={th.brd} />
              <XAxis dataKey="name" tick={{ fill: th.ts, fontSize: 11 }} />
              <YAxis tick={{ fill: th.ts, fontSize: 11 }} />
              <Tooltip content={<ChartTooltip th={th} />} />
              <Legend />
              <Bar dataKey="Regen (aktuell)" fill="#3b82f6" opacity={0.8} />
              <Bar dataKey="Regen (Vorjahr)" fill="#94a3b8" opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

/* helper used for toggle */
function toggleSeries(series, setSeries, name) {
  setSeries(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
}
