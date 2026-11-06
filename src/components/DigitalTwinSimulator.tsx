import React from 'react';
import {
  Cpu,
  Flame,
  Radio,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { webSerial } from '../services/webSerial';
import { audioBuzzer } from '../services/audioBuzzer';

interface DigitalTwinSimulatorProps {
  onTriggerTest?: (condition: 'GOOD' | 'BAD' | 'UNCERTAIN', food: string) => void;
}

export const DigitalTwinSimulator: React.FC<DigitalTwinSimulatorProps> = ({ onTriggerTest }) => {
  const [hwState, setHwState] = React.useState(webSerial.hardwareState);

  React.useEffect(() => {
    const unsub = webSerial.onHardwareState((state) => {
      setHwState({ ...state });
    });
    return unsub;
  }, []);

  const triggerLocalSimulation = (condition: 'GOOD' | 'BAD' | 'UNCERTAIN', food: string, confidence: number = 94) => {
    webSerial.simulateHardwareAction({
      food,
      condition,
      confidence,
    });
    if (condition === 'BAD') {
      audioBuzzer.playWarningPattern();
    } else if (condition === 'GOOD') {
      audioBuzzer.playSuccessChime();
    }
    if (onTriggerTest) onTriggerTest(condition, food);
  };

  return (
    <div className="glass-card rounded-3xl p-6 relative overflow-hidden border border-white/[0.08] shadow-2xl">
      {/* Decorative PCB Corner Screws */}
      <div className="absolute top-3 left-3 w-2 h-2 rounded-full border border-slate-700 bg-slate-900 shadow-inner" />
      <div className="absolute top-3 right-3 w-2 h-2 rounded-full border border-slate-700 bg-slate-900 shadow-inner" />
      <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full border border-slate-700 bg-slate-900 shadow-inner" />
      <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full border border-slate-700 bg-slate-900 shadow-inner" />

      {/* PCB Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 mb-5 border-b border-white/[0.06] gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold tracking-wider uppercase font-mono text-white">
                Hardware Digital Twin & Breadboard Mirror
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                Physical Twin
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Live bi-directional mirror of ESP32 GPIOs & I2C bus traffic
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-black/40 text-slate-400 border border-white/[0.05]">
            I2C: 0x27 / 100kHz
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-emerald-400" />
            3.3V Logic
          </span>
        </div>
      </div>

      {/* Main Breadboard Circuit Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LCD 16x2 Component */}
        <div className="lg:col-span-7 flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-br from-slate-950/90 via-[#0a101b] to-black border border-white/[0.08] shadow-2xl relative">
          <div className="flex items-center justify-between mb-3 text-[11px] font-mono">
            <span className="text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              16x2 HD44780 I2C MODULE
            </span>
            <span className="text-emerald-400/80">SDA: GPIO 21 · SCL: GPIO 22</span>
          </div>

          {/* LCD Bezel & Display Screen */}
          <div className="p-3 rounded-xl bg-[#141b18] border-2 border-[#202c25] shadow-inner relative">
            <div className="lcd-screen-realistic p-5 rounded-lg text-lg select-none">
              <div className="font-bold whitespace-pre truncate font-mono tracking-widest text-[#55f38e]">
                {hwState.displayLine1.padEnd(16, ' ').slice(0, 16)}
              </div>
              <div className="font-bold whitespace-pre truncate font-mono tracking-widest text-[#3ee079] mt-2">
                {hwState.displayLine2.padEnd(16, ' ').slice(0, 16)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500 font-mono">
            <span>PCF8574 Backpack</span>
            <span>Baud: 115200 bps</span>
            <span className="text-emerald-400/90 font-bold">Contrast 100%</span>
          </div>
        </div>

        {/* Indicators Panel (Green LED, Red LED, Warning Buzzer) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-br from-slate-950/90 via-[#0a101b] to-black border border-white/[0.08] shadow-2xl space-y-4">
          <div className="text-xs font-mono text-slate-400 tracking-wider uppercase pb-2 border-b border-white/[0.05] flex justify-between items-center">
            <span>GPIO Outputs</span>
            <span className="text-[10px] text-slate-500">220Ω Resistors</span>
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {/* Green LED Output */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/[0.05] transition-all duration-300">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div
                    className={`w-7 h-7 rounded-full border-2 transition-all duration-300 ${
                      hwState.greenLed
                        ? 'led-dome-green border-white shadow-[0_0_20px_#22c55e]'
                        : 'led-dome-green-off border-slate-700'
                    }`}
                  />
                  {hwState.greenLed && (
                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Green LED</span>
                    <span className="text-[10px] font-normal text-emerald-400">(FRESH / GOOD)</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">GPIO 18 · Anode / 220Ω</div>
                </div>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  hwState.greenLed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-600 border-slate-800'
                }`}
              >
                {hwState.greenLed ? 'ACTIVE (HIGH)' : 'IDLE (LOW)'}
              </span>
            </div>

            {/* Red LED Output */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/[0.05] transition-all duration-300">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div
                    className={`w-7 h-7 rounded-full border-2 transition-all duration-300 ${
                      hwState.redLed
                        ? 'led-dome-red border-white shadow-[0_0_20px_#ef4444]'
                        : 'led-dome-red-off border-slate-700'
                    }`}
                  />
                  {hwState.redLed && (
                    <div className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Red LED</span>
                    <span className="text-[10px] font-normal text-rose-400">(SPOILED / BAD)</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">GPIO 19 · Anode / 220Ω</div>
                </div>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  hwState.redLed
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20'
                    : 'bg-slate-950 text-slate-600 border-slate-800'
                }`}
              >
                {hwState.redLed ? 'ACTIVE (HIGH)' : 'IDLE (LOW)'}
              </span>
            </div>

            {/* Warning Buzzer Output */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/[0.05] transition-all duration-300">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                    hwState.buzzer
                      ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_#f59e0b] animate-bounce'
                      : 'bg-slate-900 border border-slate-800 text-slate-600'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Active Buzzer</span>
                    <span className="text-[10px] font-normal text-amber-400">(Spoilage Alarm)</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">GPIO 23 · 2.4kHz Transistor</div>
                </div>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  hwState.buzzer
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-slate-950 text-slate-600 border-slate-800'
                }`}
              >
                {hwState.buzzer ? 'BEEPING' : 'MUTED'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulator Test Triggers Bar */}
      <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Interactive Simulation & Telemetry Trigger:</span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => triggerLocalSimulation('GOOD', 'Apple', 94)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition shadow-sm hover:scale-105 active:scale-95"
          >
            Simulate GOOD (Apple 94%)
          </button>
          <button
            onClick={() => triggerLocalSimulation('BAD', 'Tomato', 91)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition shadow-sm hover:scale-105 active:scale-95"
          >
            Simulate BAD (Tomato 91%)
          </button>
          <button
            onClick={() => triggerLocalSimulation('UNCERTAIN', 'Banana', 45)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition shadow-sm hover:scale-105 active:scale-95"
          >
            Simulate UNCERTAIN
          </button>
        </div>
      </div>
    </div>
  );
};
