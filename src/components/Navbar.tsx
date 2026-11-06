import React from 'react';
import {
  Activity,
  Camera,
  Cpu,
  History,
  LayoutDashboard,
  Package,
  PlusCircle,
  Settings,
  Sparkles,
  Thermometer,
  Upload,
  Usb,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { HardwareConnectionState } from '../types';
import { audioBuzzer } from '../services/audioBuzzer';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  hardwareState: HardwareConnectionState;
  onConnectSerial: () => void;
  onDisconnectSerial: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  hardwareState,
  onConnectSerial,
  onDisconnectSerial,
}) => {
  const [isMuted, setIsMuted] = React.useState(audioBuzzer.getMuted());
  const [currentTime, setCurrentTime] = React.useState(new Date().toLocaleTimeString());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    audioBuzzer.setMuted(next);
    setIsMuted(next);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'camera', label: 'AI Camera', icon: Camera, badge: 'Live' },
    { id: 'manual', label: 'Manual Entry', icon: PlusCircle },
    { id: 'upload', label: 'Photo Upload', icon: Upload },
    { id: 'history', label: 'Audit Log', icon: History },
    { id: 'inventory', label: 'Smart Inventory', icon: Package },
    { id: 'hardware', label: 'ESP32 Studio', icon: Cpu, badge: 'USB' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#080c15]/80 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Identity */}
          <div
            className="flex items-center gap-3.5 cursor-pointer group select-none"
            onClick={() => onNavigate('dashboard')}
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-400/40 group-hover:scale-105 transition-all duration-300">
              <span className="text-xl filter drop-shadow">🥗</span>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 border-2 border-[#080c15] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Expiry First
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono tracking-wider font-semibold">
                  v2.5 IoT
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                <span>Smart Refrigerator Hub</span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Online
                </span>
              </div>
            </div>
          </div>

          {/* Center: Refrigerator Sensor Telemetry Pill */}
          <div className="hidden xl:flex items-center gap-4 px-3.5 py-1.5 rounded-2xl bg-slate-900/60 border border-white/[0.06] text-xs font-mono text-slate-300 shadow-inner">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
              <span>3.8°C</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-emerald-300">
              <span className="text-[10px] uppercase text-slate-500">Humidity:</span>
              <span>58% RH</span>
            </div>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400 text-[11px]">{currentTime}</span>
          </div>

          {/* Right: Hardware Connectivity & Actions */}
          <div className="flex items-center gap-3">
            {/* ESP32 Status Pill */}
            <div
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all duration-300 ${
                hardwareState === 'connected'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : hardwareState === 'connecting'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 animate-pulse'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={`w-2 h-2 rounded-full ${
                    hardwareState === 'connected'
                      ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                      : hardwareState === 'connecting'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-rose-500/80'
                  }`}
                />
              </div>
              <Usb className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline font-semibold">
                {hardwareState === 'connected' ? 'ESP32 COM3' : hardwareState === 'connecting' ? 'CONNECTING...' : 'DISCONNECTED'}
              </span>
            </div>

            {/* Hardware Connect / Disconnect Action */}
            {hardwareState === 'connected' ? (
              <button
                onClick={onDisconnectSerial}
                className="px-3 py-1.5 text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl transition"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={onConnectSerial}
                className="px-3.5 py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
              >
                <Usb className="w-3.5 h-3.5" />
                <span>Connect ESP32</span>
              </button>
            )}

            {/* Audio Buzzer Synthesizer Mute Toggle */}
            <button
              onClick={toggleSound}
              title={isMuted ? 'Buzzer Simulator Muted (Click to enable)' : 'Buzzer Simulator Sound Active'}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-white/[0.06] transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 overflow-x-auto py-2.5 scrollbar-none border-t border-white/[0.05]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>

                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold uppercase ${
                      item.badge === 'Live'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
