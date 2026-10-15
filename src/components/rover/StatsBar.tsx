import { Battery, Satellite, Gauge, Radio } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { cn } from '../../lib/utils';

export function StatsBar() {
  const { telemetry, quality } = useRover();
  const batt = Math.round(telemetry.batteryPct);
  const items = [
    { icon: Battery, label: 'Battery', value: `${batt}%`, sub: batt < 20 ? 'Low battery, head back' : batt < 60 ? 'Nominal' : 'Healthy',
      ring: 'bg-emerald-50 text-emerald-600', bar: batt > 60 ? 'bg-emerald-500' : batt > 25 ? 'bg-amber-500' : 'bg-red-500', pct: batt },
    { icon: Gauge, label: 'Speed', value: `${telemetry.gps.speedMps.toFixed(1)} m/s`, sub: `Heading ${Math.round(telemetry.gps.headingDeg)}°`,
      ring: 'bg-blue-50 text-blue-600', bar: 'bg-blue-500', pct: Math.min(100, (telemetry.gps.speedMps / 2) * 100) },
    { icon: Satellite, label: 'GPS fix', value: `${telemetry.gps.sats} sats`, sub: `${quality} • HDOP ${telemetry.gps.hdop.toFixed(1)}`,
      ring: quality === 'EXCELLENT' ? 'bg-emerald-50 text-emerald-600' : quality === 'GOOD' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600',
      bar: quality === 'EXCELLENT' ? 'bg-emerald-500' : quality === 'GOOD' ? 'bg-blue-500' : 'bg-amber-500', pct: Math.min(100, (telemetry.gps.sats / 12) * 100) },
    { icon: Radio, label: 'WiFi signal', value: `${telemetry.rssiDbm} dBm`, sub: telemetry.rssiDbm > -65 ? 'Strong link' : telemetry.rssiDbm > -75 ? 'Fair link' : 'Weak link',
      ring: telemetry.rssiDbm > -65 ? 'bg-emerald-50 text-emerald-600' : telemetry.rssiDbm > -75 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600',
      bar: telemetry.rssiDbm > -65 ? 'bg-emerald-500' : telemetry.rssiDbm > -75 ? 'bg-amber-500' : 'bg-red-500', pct: Math.max(8, Math.min(100, (100 + telemetry.rssiDbm) * 2)) },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {items.map((s) => (
        <div key={s.label} className="panel panel-hover p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className={cn("min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px] rounded-2xl flex items-center justify-center", s.ring)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[20px] sm:text-[26px] font-extrabold text-slate-900 leading-none tracking-tight truncate">{s.value}</p>
              <p className="text-[12px] sm:text-[13px] font-bold text-slate-600 mt-1">{s.label}</p>
              <p className="text-[11px] sm:text-[12px] text-slate-500 truncate">{s.sub}</p>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-3 sm:mt-4">
            <div className={cn("h-full rounded-full transition-all duration-500", s.bar)} style={{ width: `${s.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}



