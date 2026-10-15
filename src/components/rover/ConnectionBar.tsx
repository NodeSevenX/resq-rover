import { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, ChevronDown, Cpu } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { EspSetupModal } from './EspSetupModal';
import { cn } from '../../lib/utils';

export function ConnectionBar() {
  const { connection, esp32Ip, esp32Base, ipValid, pollIntervalMs, lastFetchAt, fetchError, setEsp32Ip, setPollIntervalMs, connect, disconnect } = useRover();
  const [editing, setEditing] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [draftIp, setDraftIp] = useState(esp32Ip);
  const live = connection === 'live';
  const busy = connection === 'connecting';

  return (
    <div className="panel p-6">
      <div className="flex flex-col xl:flex-row xl:items-center gap-5">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={cn("w-13 h-13 min-w-[52px] min-h-[52px] rounded-2xl flex items-center justify-center shrink-0", live ? "bg-emerald-50" : "bg-slate-100")}>
            {live ? <Wifi className="w-6 h-6 text-emerald-600" /> : <WifiOff className="w-6 h-6 text-slate-400" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-[16px] font-bold text-slate-900">
                {live ? 'ESP32 Live via WiFi' : connection === 'connecting' ? 'Connecting...' : 'Simulation mode'}
              </p>
              <span className={cn("mqtt-pill", live ? "connected" : connection === 'connecting' ? "connecting" : "disconnected")}>
                {live ? `Synced ${lastFetchAt ? Math.max(0, Math.floor((Date.now() - lastFetchAt) / 1000)) : 0}s ago` : 'No ESP32 linked'}
              </span>
            </div>
            <p className="text-[13px] text-slate-400 mt-1">
              Target <span className="mono font-semibold text-slate-600">{esp32Base || '-'}</span> - polling <span className="font-semibold text-slate-600">/status · /gps · /logs</span> every {pollIntervalMs / 1000}s
            </p>
            {!ipValid && (
              <p className="text-[12px] font-semibold text-red-600 mt-1">Invalid IP/hostname - e.g. 192.168.4.2 or esp32.local</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full xl:w-auto">
          {editing ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input value={draftIp} onChange={(e) => setDraftIp(e.target.value)} placeholder="192.168.4.2" className="input !w-full sm:!w-44 mono" />
              <button onClick={() => { setEsp32Ip(draftIp.trim() || esp32Ip); setEditing(false); }} className="btn btn-secondary shrink-0">Save</button>
            </div>
          ) : (
            <button onClick={() => { setDraftIp(esp32Ip); setEditing(true); }} className="btn btn-secondary mono !px-3.5 max-w-full truncate">
              <span className="truncate">{esp32Ip}</span> <ChevronDown className="w-4 h-4 shrink-0" />
            </button>
          )}
          <button onClick={() => setHelpOpen(true)} className="btn btn-secondary mono !px-3.5 shrink-0" title="ESP32 firmware setup">
            <Cpu className="w-4 h-4" /> <span className="hidden sm:inline">Setup</span>
          </button>
          <select value={pollIntervalMs} onChange={(e) => setPollIntervalMs(Number(e.target.value))} className="select !w-auto shrink-0">
            <option value={2000}>2s refresh</option>
            <option value={3000}>3s refresh</option>
            <option value={5000}>5s refresh</option>
          </select>
          {live ? (
            <button onClick={disconnect} className="btn btn-secondary w-full sm:w-auto">Disconnect</button>
          ) : (
            <button onClick={connect} disabled={!ipValid || busy} className="btn btn-primary w-full sm:w-auto">
              <RefreshCw className={busy ? "w-4 h-4 animate-spin" : "w-4 h-4"} /> {busy ? 'Probing...' : 'Connect ESP32'}
            </button>
          )}
        </div>
      </div>
      {fetchError && !live && (
        <div className="mt-4 flex items-start gap-2.5 text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{fetchError} Vercel cannot reach local 192.168.x.x - use local dev on ESP32 WiFi for live data.</span>
        </div>
      )}
      <EspSetupModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}



