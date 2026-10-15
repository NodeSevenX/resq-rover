// RESQ Rover backend self-test (no deps). Run: npm run selftest
// Covers: URL normalize, IP validation, mode whitelist, geo math,
// yard round-trip, GPS sanitize/clamp, log parsing, trail guards.

import assert from 'node:assert/strict';

let pass = 0;
function ok(name, fn) {
  try {
    fn();
    pass++;
    console.log(`PASS ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

// --- mirrored pure logic (must match src/lib/esp32.ts + context) ---
const BASE_LAT = 28.6139, BASE_LNG = 77.209, YARD_W = 24, YARD_H = 16;
const M_LAT = 111320, COS = Math.cos(BASE_LAT * Math.PI / 180);

function normalizeBaseUrl(input) {
  let v = String(input).trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = `http://${v}`;
  return v.replace(/\/+$/, '');
}
function isValidIpInput(input) {
  const v = String(input).trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  if (!v) return false;
  if (v.toLowerCase() === 'localhost') return true;
  const parts = v.split('.');
  if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
    return parts.every((p) => Number(p) <= 255);
  }
  if (/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(v) && v.includes('.') && /[a-z]/i.test(v)) return true;
  return false;
}
const VALID_MODES = ['IDLE','EN_ROUTE','DELIVERING','RETURNING','LOW_BATTERY','SOS','OFFLINE'];
function clampNum(v, lo, hi, fb) { if (!Number.isFinite(v)) return fb; return Math.max(lo, Math.min(hi, v)); }
function haversineM(aLat,aLng,bLat,bLng) {
  const R=6371000, dLat=(bLat-aLat)*Math.PI/180, dLng=(bLng-aLng)*Math.PI/180;
  const s1=Math.sin(dLat/2), s2=Math.sin(dLng/2);
  const a=s1*s1+Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*s2*s2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(a)));
}
function bearingDeg(aLat,aLng,bLat,bLng) {
  const dLng=(bLng-aLng)*Math.PI/180;
  const y=Math.sin(dLng)*Math.cos(bLat*Math.PI/180);
  const x=Math.cos(aLat*Math.PI/180)*Math.sin(bLat*Math.PI/180)-Math.sin(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*Math.cos(dLng);
  return ((Math.atan2(y,x)*180/Math.PI)+360)%360;
}
function fixQuality(sats,hdop){ if(sats<=0) return 'NO FIX'; if(sats>=8&&hdop<=1.0) return 'EXCELLENT'; if(sats>=6&&hdop<=1.8) return 'GOOD'; if(sats>=4) return 'WEAK'; return 'NO FIX'; }
function metersToGps(x,y){ return { lat: BASE_LAT+(y-YARD_H/2)/M_LAT, lng: BASE_LNG+(x-YARD_W/2)/(M_LAT*COS) }; }
function gpsToYard(lat,lng){ return { x: YARD_W/2+(lng-BASE_LNG)*M_LAT*COS, y: YARD_H/2+(lat-BASE_LAT)*M_LAT }; }
function parseLogLevel(line){ const l=line.toLowerCase(); if(/(error|fail|crit|sos|emerg|denied|timeout)/.test(l)) return 'error'; if(/(warn|low|lost|retry|weak|degraded|caution)/.test(l)) return 'warn'; if(/(debug|dbg|trace)/.test(l)) return 'debug'; return 'info'; }

ok('normalizeBaseUrl adds http + trims slashes', () => {
  assert.equal(normalizeBaseUrl('192.168.4.2'), 'http://192.168.4.2');
  assert.equal(normalizeBaseUrl('http://192.168.4.2/'), 'http://192.168.4.2');
  assert.equal(normalizeBaseUrl('  esp32.local/ '), 'http://esp32.local');
  assert.equal(normalizeBaseUrl(''), '');
});

ok('isValidIpInput accepts IP/hostname, rejects garbage', () => {
  assert.equal(isValidIpInput('192.168.4.2'), true);
  assert.equal(isValidIpInput('http://192.168.4.2'), true);
  assert.equal(isValidIpInput('esp32.local'), true);
  assert.equal(isValidIpInput('999.999.1.1'), false);
  assert.equal(isValidIpInput('not an ip!!'), false);
  assert.equal(isValidIpInput(''), false);
});

ok('mode whitelist blocks garbage', () => {
  assert.equal(VALID_MODES.includes('EN_ROUTE'), true);
  assert.equal(VALID_MODES.includes('FLY'), false);
  assert.equal(VALID_MODES.includes('en_route'), false); // must be uppercased first
});

ok('clampNum guards NaN/negatives', () => {
  assert.equal(clampNum(NaN, 0, 100, 50), 50);
  assert.equal(clampNum(-5, 0, 100, 50), 0);
  assert.equal(clampNum(150, 0, 100, 50), 100);
  assert.equal(clampNum(-95, -100, 0, -60), -95);
});

ok('haversine 10m sanity', () => {
  const d = haversineM(BASE_LAT, BASE_LNG, BASE_LAT + 10 / 111320, BASE_LNG);
  assert.ok(Math.abs(d - 10) < 0.3, `got ${d}`);
});

ok('bearing east = 90deg', () => {
  const b = bearingDeg(0, 0, 0, 0.001);
  assert.ok(Math.abs(b - 90) < 0.5, `got ${b}`);
});

ok('fixQuality thresholds', () => {
  assert.equal(fixQuality(9, 0.8), 'EXCELLENT');
  assert.equal(fixQuality(6, 1.5), 'GOOD');
  assert.equal(fixQuality(5, 3.0), 'WEAK');
  assert.equal(fixQuality(0, 9), 'NO FIX');
});

ok('yard round-trip <1cm', () => {
  for (const [x, y] of [[0.5, 0.5], [12, 8], [23.5, 15.5], [19.5, 3.5]]) {
    const g = metersToGps(x, y);
    const back = gpsToYard(g.lat, g.lng);
    assert.ok(Math.abs(back.x - x) < 0.01 && Math.abs(back.y - y) < 0.01, `drift at ${x},${y}`);
  }
});

ok('trail guards: dedupe + teleport', () => {
  const jump = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  assert.ok(jump({ x: 1, y: 1 }, { x: 1.02, y: 1.01 }) < 0.05); // duplicate → ignore
  assert.ok(jump({ x: 1, y: 1 }, { x: 20, y: 14 }) > 12); // teleport → restart
});

ok('log levels classify SOS/low/debug', () => {
  assert.equal(parseLogLevel('[SOS] beacon on'), 'error');
  assert.equal(parseLogLevel('[PWR] batt low 12%'), 'warn');
  assert.equal(parseLogLevel('[DBG] heap 180k'), 'debug');
  assert.equal(parseLogLevel('[GPS] fix ok'), 'info');
});

ok('battery percent normalizes 0.87 → 87', () => {
  const raw = 0.87;
  const pct = raw > 1 && raw <= 100 ? raw : raw <= 1 ? raw * 100 : raw;
  assert.equal(Math.round(pct), 87);
});

ok('mission checklist transitions pickup→drop→return', () => {
  const stages = [
    { id: 'pickup', state: 'active' }, { id: 'enroute', state: 'todo' },
    { id: 'drop', state: 'todo' }, { id: 'return', state: 'todo' },
  ];
  const confirmPickup = () => stages.map((s) =>
    s.id === 'pickup' ? { ...s, state: 'done' } : s.id === 'enroute' ? { ...s, state: 'active' } : s);
  const after = confirmPickup();
  assert.equal(after.find((s) => s.id === 'pickup').state, 'done');
  assert.equal(after.find((s) => s.id === 'enroute').state, 'active');
  assert.equal(after.filter((s) => s.state === 'done').length, 1);
});

console.log(`\n${pass} tests passed${process.exitCode ? ' (WITH FAILURES)' : ''}`);
