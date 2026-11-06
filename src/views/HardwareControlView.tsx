import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Cpu,
  FileCode,
  HardDrive,
  Info,
  Layers,
  Terminal,
  Usb,
} from 'lucide-react';
import { HardwareConnectionState } from '../types';
import { DigitalTwinSimulator } from '../components/DigitalTwinSimulator';
import { SerialConsole } from '../components/SerialConsole';
import { webSerial } from '../services/webSerial';

interface HardwareControlViewProps {
  hardwareState: HardwareConnectionState;
  onConnectSerial: () => void;
  onDisconnectSerial: () => void;
}

export const HardwareControlView: React.FC<HardwareControlViewProps> = ({
  hardwareState,
  onConnectSerial,
  onDisconnectSerial,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            ESP32 Hardware Hub & Web Serial Console
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Direct browser-to-microcontroller USB serial link operating at 115200 baud with bidirectional JSON protocol.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${hardwareState === 'connected'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : hardwareState === 'connecting'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${hardwareState === 'connected'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                  : hardwareState === 'connecting'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-500'
                }`}
            />
            <span>PORT: {hardwareState.toUpperCase()}</span>
          </div>

          {hardwareState === 'connected' ? (
            <button
              onClick={onDisconnectSerial}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition"
            >
              Disconnect USB
            </button>
          ) : (
            <button
              onClick={onConnectSerial}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <Usb className="w-4 h-4" />
              <span>Connect ESP32</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Section: Digital Twin Simulator */}
      <DigitalTwinSimulator />

      {/* Mid Section: Web Serial Console & Protocol Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Serial Terminal */}
        <div className="lg:col-span-8">
          <SerialConsole
            hardwareState={hardwareState}
            onConnect={onConnectSerial}
            onDisconnect={onDisconnectSerial}
          />
        </div>

        {/* Right: Wiring & Specification Quick Reference */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              ESP32 Pinout Configuration
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-emerald-400 font-bold">GPIO 13</span>
                <span className="text-slate-300">Green LED (220Ω to GND)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-rose-400 font-bold">GPIO 14</span>
                <span className="text-slate-300">Red LED (220Ω to GND)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-amber-400 font-bold">GPIO 27</span>
                <span className="text-slate-300">Active Warning Buzzer</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-cyan-400 font-bold">GPIO 21 (SDA)</span>
                <span className="text-slate-300">I2C LCD Data</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-cyan-400 font-bold">GPIO 22 (SCL)</span>
                <span className="text-slate-300">I2C LCD Clock</span>
              </div>
            </div>
          </div>

          {/* Firmware & Protocol Rules */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              Serial Protocol Specifications
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              Payload: One JSON string per line terminated by <code className="text-emerald-400">\n</code>
            </p>

            <div className="p-3 rounded-xl bg-black border border-slate-800 text-[11px] font-mono text-cyan-300 space-y-1 overflow-x-auto">
              <div>// TX Command to ESP32:</div>
              <div className="text-slate-100">
                &#123;"food":"Apple","condition":"GOOD","confidence":94&#125;
              </div>
              <div className="mt-1.5">// ESP32 Acknowledgment:</div>
              <div className="text-emerald-300">
                &#123;"status":"success","message":"Hardware updated"&#125;
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-sans">
              Firmware file available at: <br />
              <code className="text-slate-300 font-mono text-[10px]">
                d:\esp23\firmware\esp32_expiry_refrigerator\esp32_expiry_refrigerator.ino
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

