import { Battery, Package, Navigation, Signal } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { cn } from '../../lib/utils';

const modeStyles: Record<string, string> = {
  IDLE: 'bg-slate-100 text-slate-600 border border-slate-200',
  EN_ROUTE: 'bg-blue-50 text-blue-700 border border-blue-200',
  DELIVERING: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  RETURNING: 'bg-amber-50 text-amber-700 border border-amber-200',
  LOW_BATTERY: 'bg-red-50 text-red-700 border border-red-200',
  SOS: 'bg-red-600 text-white border border-red-600 shadow-lg shadow-red-500/30',
  OFFLINE: 'bg-slate-100 text-slate-400 border border-slate-200',
};

export function RoverStatusCard() {
  const { telemetry, sendCommand, quality, gpsAgeS, triggerSOS } = useRover();
  const batt = Math.round(telemetry.batteryPct);
  const battBar = batt > 60
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
    : batt > 25 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-red-600 to-red-400';
  const rssi = telemetry.rssiDbm;
  const sigBars = rssi > -60 ? 4 : rssi > -70 ? 3 : rssi > -80 ? 2 : 1;

  return (
    <div className="panel p-5 sm:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3.5">
          <div className="min-w-[52px] min-h-[52px] rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-rose-700 flex items-center justify-center text-white font-extrabold text-[18px] shadow-lg shadow-red-500/30">R1</div>
          <div>
            <p className="text-[16px] font-extrabold text-slate-900 leading-none">RESQ-R1</p>
            <p className="text-[12px] text-slate-400 mt-1 flex items-center gap-1.5">
              Supply rover • ESP32
              <span className={cn("inline-flex items-center gap-1 font-bold", gpsAgeS <= 3 ? 'text-emerald-600' : 'text-amber-600')}>
                <span className={cn("w-1.5 h-1.5 rounded-full", gpsAgeS <= 3 ? 'bg-emerald-500' : 'bg-amber-500')} />
                {gpsAgeS <= 1 ? 'LIVE' : `${gpsAgeS}s`}
              </span>
            </p>
          </div>
        </div>
        <span className={cn("badge !text-[12px] !px-3 !py-1.5", modeStyles[telemetry.mode])}>{telemetry.mode.replace('_', ' ')}</span>
      </div>

      <div className="space-y-5 flex-1">
        <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-[13px] font-bold text-slate-500"><Battery className="w-4 h-4" /> BATTERY</span>
            <span className={cn("text-[16px] font-extrabold", batt > 60 ? 'text-emerald-600' : batt > 25 ? 'text-amber-600' : 'text-red-600')}>{batt}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200/70 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", battBar)} style={{ width: `${batt}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <span className="flex items-center gap-1.5 text-[12px] text-slate-400"><Signal className="w-3.5 h-3.5" /> {rssi} dBm</span>
            <span className="flex items-end gap-0.5">
              {[1, 2, 3, 4].map((b) => (
                <span key={b} className={cn("w-1 rounded-full", b <= sigBars ? 'bg-emerald-500' : 'bg-slate-200')} style={{ height: 5 + b * 3 }} />
              ))}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-[13px] font-bold text-slate-500"><Package className="w-4 h-4" /> {telemetry.payload} DELIVERY</span>
            <span className="text-[15px] font-extrabold text-slate-800">{Math.round(telemetry.missionPct)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200/70 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-red-600 via-red-500 to-amber-400 transition-all duration-500" style={{ width: `${telemetry.missionPct}%` }} />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
          <p className="text-[11px] font-bold tracking-[0.12em] text-slate-400 mb-2 flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5 text-sky-300" /> CURRENT FIX: {quality}</p>
          <p className="mono text-[14px] font-bold text-white">{telemetry.gps.lat.toFixed(6)}, {telemetry.gps.lng.toFixed(6)}</p>
          <p className="text-[13px] text-slate-400 mt-1.5">
            <span className="text-sky-300 font-semibold">{telemetry.gps.speedMps.toFixed(2)} m/s</span> • {Math.round(telemetry.gps.headingDeg)}° • {telemetry.gps.sats} sats • {telemetry.tempC.toFixed(1)}°C
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/60 py-3.5"><p className="text-[18px] font-extrabold text-sky-700">{telemetry.gps.sats}</p><p className="text-[11px] text-sky-600/70 font-bold">SATS</p></div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50/60 py-3.5"><p className="text-[18px] font-extrabold text-violet-700">{telemetry.gps.hdop.toFixed(1)}</p><p className="text-[11px] text-violet-600/70 font-bold">HDOP</p></div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 py-3.5"><p className="text-[18px] font-extrabold text-slate-800">{Math.floor(telemetry.uptimeS / 60)}m</p><p className="text-[11px] text-slate-400 font-bold">UPTIME</p></div>
        </div>
      </div>

      <div className="flex gap-2.5 mt-5">
        <button onClick={() => sendCommand('RETURN_TO_BASE')} className="btn btn-secondary flex-1">Return to base</button>
        <button onClick={triggerSOS} className="btn btn-primary flex-1">SOS beacon</button>
      </div>
    </div>
  );
}



