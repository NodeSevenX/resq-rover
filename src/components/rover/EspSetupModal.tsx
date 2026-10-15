import { useState } from 'react';
import { X, Copy, Check, Cpu } from 'lucide-react';
import { cn } from '../../lib/utils';

const ARDUINO = `// RESQ Rover ESP32 - minimal endpoints the dashboard polls
// GET /status  GET /gps  GET /logs
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

WebServer server(80);

void setup() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP("RESQ-Rover", "resq12345"); // dashboard joins this, IP 192.168.4.1 / rover .2
  server.enableCORS(true); // REQUIRED or browser blocks polling

  server.on("/status", [] {
    StaticJsonDocument<256> d;
    d["batteryPct"] = 87; d["rssiDbm"] = WiFi.RSSI();
    d["uptimeS"] = millis() / 1000; d["tempC"] = 36.4;
    d["mode"] = "EN_ROUTE"; d["payload"] = "MEDKIT-A"; d["missionPct"] = 34;
    String s; serializeJson(d, s);
    server.send(200, "application/json", s);
  });

  server.on("/gps", [] {
    StaticJsonDocument<256> d;
    d["lat"] = 28.613900; d["lng"] = 77.209000;
    d["speedMps"] = 0.9; d["headingDeg"] = 48;
    d["sats"] = 9; d["hdop"] = 0.8;
    String s; serializeJson(d, s);
    server.send(200, "application/json", s);
  });

  server.on("/logs", [] {
    // plain text, one line per row - or JSON array, both parse
    server.send(200, "text/plain",
      "[GPS] 3D fix sats=9 hdop=0.8\\n[NAV] hdg 048 wp PICKUP B\\n[WIFI] RSSI -58 dBm\\n");
  });

  server.begin();
}
void loop() { server.handleClient(); }`;

const CURL = `# from a laptop on the ESP32 WiFi - must all answer before dashboard can go live
curl http://192.168.4.2/status
curl http://192.168.4.2/gps
curl http://192.168.4.2/logs`;

function Code({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
      <button
        onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/10 text-slate-200 hover:bg-white/20 transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="mono text-[12px] leading-[1.7] text-slate-200 p-5 pr-20 overflow-x-auto whitespace-pre">{text}</pre>
    </div>
  );
}

export function EspSetupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'firmware' | 'test'>('firmware');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative panel !rounded-[20px] w-full max-w-[720px] max-h-[86vh] overflow-y-auto p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-[18px] font-extrabold text-slate-900 tracking-tight">ESP32 firmware setup</p>
              <p className="text-[13px] text-slate-400">Three endpoints plus one CORS line, then Connect works</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="filter-group w-fit mb-5">
          {(['firmware', 'test'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("filter-btn capitalize", tab === t && "active")}>
              {t === 'firmware' ? 'Arduino code' : 'Verify with curl'}
            </button>
          ))}
        </div>

        {tab === 'firmware' ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3.5">
              <p className="text-[13px] font-bold text-amber-800">The #1 failure is a missing CORS header.</p>
              <p className="text-[13px] text-amber-700 mt-0.5">Without <span className="mono font-bold">server.enableCORS(true)</span> the browser blocks every poll and the dashboard stays simulated.</p>
            </div>
            <Code text={ARDUINO} />
            <p className="text-[12px] text-slate-400">Field names are tolerant (<span className="mono">battery/batteryPct</span>, <span className="mono">lng/lon</span>, <span className="mono">sats/satellites</span> all parse). Speed/heading optional - derived from GPS deltas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Code text={CURL} />
            <p className="text-[13px] text-slate-500">All three must return <span className="font-bold text-emerald-600">HTTP 200</span> from the laptop. Then paste the same IP in the dashboard and hit Connect.</p>
          </div>
        )}
      </div>
    </div>
  );
}



