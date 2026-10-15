export type RoverMode =
  | 'IDLE'
  | 'EN_ROUTE'
  | 'DELIVERING'
  | 'RETURNING'
  | 'LOW_BATTERY'
  | 'SOS'
  | 'OFFLINE';

export type GpsFix = {
  lat: number;
  lng: number;
  speedMps: number;
  headingDeg: number;
  sats: number;
  hdop: number;
  timestamp: number;
};

export type RoverTelemetry = {
  batteryPct: number;
  rssiDbm: number;
  uptimeS: number;
  tempC: number;
  mode: RoverMode;
  payload: string;
  missionPct: number;
  gps: GpsFix;
};

export type TrailPoint = {
  x: number; // meters east of yard origin
  y: number; // meters north of yard origin
  lat: number;
  lng: number;
  timestamp: number;
};

export type WifiLogLine = {
  id: string;
  raw: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
};

export type LogEntry = {
  id: string;
  message: string;
  source: 'esp32' | 'gps' | 'rover' | 'system';
  level: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
};

export type ConnectionState = 'live' | 'simulated' | 'connecting' | 'error';



