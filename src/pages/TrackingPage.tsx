import { MapPin, Navigation, Satellite } from 'lucide-react';
import { useRover } from '../context/RoverContext';
import { GpsTrailMap } from '../components/rover/GpsTrailMap';
import { RoverStatusCard } from '../components/rover/RoverStatusCard';

export function TrackingPage() {
  const { telemetry, trail } = useRover();
  const cur = trail[trail.length - 1];

  const cards = [
    { icon: MapPin, label: 'Coordinates', main: `${telemetry.gps.lat.toFixed(6)}`, sub: `${telemetry.gps.lng.toFixed(6)}`, tint: 'border-sky-100 bg-sky-50/60', text: 'text-sky-700' },
    { icon: Navigation, label: 'Motion', main: `${telemetry.gps.speedMps.toFixed(2)} m/s`, sub: `Heading ${Math.round(telemetry.gps.headingDeg)}°`, tint: 'border-blue-100 bg-blue-50/60', text: 'text-blue-700' },
    { icon: Satellite, label: 'Fix quality', main: `${telemetry.gps.sats} sats`, sub: `HDOP ${telemetry.gps.hdop.toFixed(1)}`, tint: 'border-violet-100 bg-violet-50/60', text: 'text-violet-700' },
  ];

  return (
    <div className="page space-y-5 sm:space-y-6">
      <div>
        <h1 className="page-title">GPS tracking</h1>
        <p className="page-sub">Where the rover is and where it has been in the yard</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 min-w-0 space-y-5">
          <GpsTrailMap />
          <div className="panel p-5 sm:p-6">
            <p className="section-title !text-[16px] mb-4">Current fix</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {cards.map((c) => (
                <div key={c.label} className={`border rounded-2xl p-4 sm:p-5 ${c.tint}`}>
                  <p className="text-[11px] sm:text-[12px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-2">
                    <c.icon className="w-3.5 h-3.5" /> {c.label}
                  </p>
                  <p className={`mono text-[14px] sm:text-[15px] font-bold ${c.text} break-all`}>{c.main}</p>
                  <p className="mono text-[12px] sm:text-[13px] text-slate-500 mt-1">{c.sub}</p>
                </div>
              ))}
            </div>
            {cur && (
              <p className="text-[12px] sm:text-[13px] text-slate-500 mt-4">
                Yard position <span className="mono font-semibold text-slate-700">x={cur.x.toFixed(1)}m y={cur.y.toFixed(1)}m</span>
              </p>
            )}
          </div>
        </div>
        <div className="xl:col-span-5 min-w-0"><RoverStatusCard /></div>
      </div>
    </div>
  );
}



