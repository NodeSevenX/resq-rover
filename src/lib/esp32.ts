// ESP32 HTTP polling + geo math for RESQ Rover.
// Endpoints (tolerant):
//   GET <base>/status -> { batteryPct, rssiDbm, uptimeS, tempC, mode, payload, missionPct }
//   GET <base>/gps    -> { lat, lng, speedMps, headingDeg, sats, hdop }
//   GET <base>/logs   -> text/plain lines OR JSON array / { logs: [] }

export type Esp32StatusJson = {
  batteryPct?: number;
  battery?: number;
  rssiDbm?: number;
  rssi?: number;
  uptimeS?: number;
  uptime?: number;
  tempC?: number;
  temp?: number;
  mode?: string;
  payload?: string;
  missionPct?: number;
  mission?: number;
};

export type Esp32GpsJson = {
  lat?: number;
  latitude?: number;
  lng?: number;
  lon?: number;
  longitude?: number;
  speedMps?: number;
  speed?: number;
  headingDeg?: number;
  heading?: number;
  sats?: number;
  satellites?: number;
  hdop?: number;
};

export function normalizeBaseUrl(input: string): string {
  let v = input.trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = `http://${v}`;
  return v.replace(/\/+$/, '');
}

async function fetchWithTimeout(url: string, ms = 4000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
  } finally {
    clearTimeout(t);
  }
}

async function tryJsonEndpoints(urls: string[]): Promise<Record<string, unknown> | null> {
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.trim()) continue;
      try {
        const j = JSON.parse(text);
        if (j && typeof j === 'object' && !Array.isArray(j)) return j as Record<string, unknown>;
      } catch {
        continue;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}
function str(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

export async function fetchEsp32Status(baseUrl: string): Promise<Esp32StatusJson | null> {
  const j = await tryJsonEndpoints([`${baseUrl}/status`, `${baseUrl}/api/status`, `${baseUrl}/data`, `${baseUrl}/telemetry`]);
  if (!j) return null;
  const out: Esp32StatusJson = {};
  const b = num(j.batteryPct ?? j.battery ?? j.bat ?? j.soc);
  if (b !== undefined) out.batteryPct = Math.max(0, Math.min(100, b > 1 && b <= 100 ? b : b <= 1 ? b * 100 : b));
  const r = num(j.rssiDbm ?? j.rssi ?? j.wifiRssi);
  if (r !== undefined) out.rssiDbm = r;
  const u = num(j.uptimeS ?? j.uptime ?? j.uptime_s);
  if (u !== undefined) out.uptimeS = u;
  const t = num(j.tempC ?? j.temp ?? j.temperature);
  if (t !== undefined) out.tempC = t;
  const m = str(j.mode ?? j.state);
  if (m) out.mode = m.toUpperCase();
  const p = str(j.payload ?? j.cargo);
  if (p) out.payload = p;
  const mp = num(j.missionPct ?? j.mission ?? j.progress);
  if (mp !== undefined) out.missionPct = Math.max(0, Math.min(100, mp));
  if (Object.keys(out).length === 0) return null;
  return out;
}

export async function fetchEsp32Gps(baseUrl: string): Promise<Esp32GpsJson | null> {
  const j = await tryJsonEndpoints([`${baseUrl}/gps`, `${baseUrl}/api/gps`, `${baseUrl}/location`, `${baseUrl}/position`]);
  if (!j) return null;
  const lat = num(j.lat ?? j.latitude);
  const lng = num(j.lng ?? j.lon ?? j.longitude);
  if (lat === undefined || lng === undefined) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {
    lat, lng,
    speedMps: num(j.speedMps ?? j.speed),
    headingDeg: num(j.headingDeg ?? j.heading),
    sats: num(j.sats ?? j.satellites),
    hdop: num(j.hdop),
  };
}

export async function fetchEsp32Logs(baseUrl: string): Promise<string[] | null> {
  const candidates = [`${baseUrl}/logs`, `${baseUrl}/api/logs`, `${baseUrl}/log`];
  for (const url of candidates) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.trim()) continue;
      try {
        const j = JSON.parse(text);
        if (Array.isArray(j)) return j.map(String).filter(Boolean).slice(-80);
        if (j && typeof j === 'object' && Array.isArray((j as { logs?: unknown }).logs)) {
          return ((j as { logs: unknown[] }).logs).map(String).filter(Boolean).slice(-80);
        }
      } catch { /* plain text below */ }
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length > 0) return lines.slice(-80);
    } catch {
      continue;
    }
  }
  return null;
}

// ---- geo math ----

export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const a = s1 * s1 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function bearingDeg(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLng = (((bLng - aLng) * Math.PI) / 180);
  const y = Math.sin(dLng) * Math.cos((bLat * Math.PI) / 180);
  const x = Math.cos((aLat * Math.PI) / 180) * Math.sin((bLat * Math.PI) / 180)
    - Math.sin((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export type FixQuality = 'EXCELLENT' | 'GOOD' | 'WEAK' | 'NO FIX';

export function fixQuality(sats: number, hdop: number): FixQuality {
  if (sats <= 0) return 'NO FIX';
  if (sats >= 8 && hdop <= 1.0) return 'EXCELLENT';
  if (sats >= 6 && hdop <= 1.8) return 'GOOD';
  if (sats >= 4) return 'WEAK';
  return 'NO FIX';
}

export function parseLogLevel(line: string): 'info' | 'warn' | 'error' | 'debug' {
  const l = line.toLowerCase();
  if (/(error|fail|crit|sos|emerg|denied|timeout)/.test(l)) return 'error';
  if (/(warn|low|lost|retry|weak|degraded|caution)/.test(l)) return 'warn';
  if (/(debug|dbg|trace)/.test(l)) return 'debug';
  return 'info';
}

export function parseLogTag(line: string): string {
  const m = line.match(/\[([A-Z0-9 _-]{2,12})\]/i);
  return m ? m[1].toUpperCase() : 'SYS';
}

// ---- validation / sanitize helpers (backend hardening) ----

export const VALID_MODES = ['IDLE', 'EN_ROUTE', 'DELIVERING', 'RETURNING', 'LOW_BATTERY', 'SOS', 'OFFLINE'] as const;

export function isValidMode(m: unknown): m is (typeof VALID_MODES)[number] {
  return typeof m === 'string' && (VALID_MODES as readonly string[]).includes(m.toUpperCase());
}

export function clampNum(v: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, v));
}

export function isValidIpInput(input: string): boolean {
  const v = input.trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  if (!v) return false;
  if (v.toLowerCase() === 'localhost') return true;
  const parts = v.split('.');
  // looks-like-IPv4 (all numeric) must pass strict octet check - never fall through to hostname
  if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
    return parts.every((p) => Number(p) <= 255);
  }
  if (/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(v) && v.includes('.') && /[a-z]/i.test(v)) return true;
  return false;
}



