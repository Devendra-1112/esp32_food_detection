import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  HelpCircle,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  Volume2,
  XCircle,
  Zap,
} from 'lucide-react';
import { HardwareConnectionState, VisionResult } from '../types';
import { webSerial, sendResultToESP32 } from '../services/webSerial';
import { audioBuzzer } from '../services/audioBuzzer';

interface ResultCardProps {
  result: VisionResult;
  hardwareState: HardwareConnectionState;
  onAddToInventory?: (result: VisionResult) => void;
  onSendSuccess?: () => void;
  imageUrl?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  hardwareState,
  onAddToInventory,
  onSendSuccess,
  imageUrl,
}) => {
  const [isTransmitting, setIsTransmitting] = React.useState(false);
  const [transmitStatus, setTransmitStatus] = React.useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  const isGood = result.condition === 'GOOD';
  const isBad = result.condition === 'BAD';
  const isUncertain = result.condition === 'UNCERTAIN';

  const handleTransmit = async () => {
    setIsTransmitting(true);
    setTransmitStatus({ type: 'idle', message: '' });

    try {
      if (hardwareState === 'connected') {
        const ack = await sendResultToESP32(
          result.food_name,
          result.condition,
          result.confidence
        );

        if (isBad) audioBuzzer.playWarningPattern();
        if (isGood) audioBuzzer.playSuccessChime();

        setTransmitStatus({
          type: 'success',
          message: `ESP32 ACK Received: ${ack.message || 'Hardware updated'}`,
        });
        if (onSendSuccess) onSendSuccess();
      } else {
        webSerial.simulateHardwareAction({
          food: result.food_name,
          condition: result.condition,
          confidence: result.confidence,
        });

        if (isBad) audioBuzzer.playWarningPattern();
        if (isGood) audioBuzzer.playSuccessChime();

        setTransmitStatus({
          type: 'error',
          message: 'ESP32 not connected. Output mirrored on Digital Twin Simulator only.',
        });
      }
    } catch (err: any) {
      setTransmitStatus({
        type: 'error',
        message: err.message || 'Hardware transmission failed.',
      });
    } finally {
      setIsTransmitting(false);
    }
  };

  return (
    <div
      className={`glass-card rounded-3xl border transition-all duration-300 overflow-hidden shadow-2xl relative ${
        isGood
          ? 'border-emerald-500/40 shadow-emerald-950/30'
          : isBad
          ? 'border-rose-500/40 shadow-rose-950/30'
          : 'border-amber-500/40 shadow-amber-950/30'
      }`}
    >
      {/* Top Status Header */}
      <div
        className={`px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b ${
          isGood
            ? 'bg-gradient-to-r from-emerald-950/70 via-emerald-900/30 to-transparent border-emerald-500/20 text-emerald-300'
            : isBad
            ? 'bg-gradient-to-r from-rose-950/70 via-rose-900/30 to-transparent border-rose-500/20 text-rose-300'
            : 'bg-gradient-to-r from-amber-950/70 via-amber-900/30 to-transparent border-amber-500/20 text-amber-300'
        }`}
      >
        <div className="flex items-center gap-3.5">
          {isGood && (
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 animate-pulse" />
            </div>
          )}
          {isBad && (
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/20">
              <XCircle className="w-6 h-6 animate-bounce" />
            </div>
          )}
          {isUncertain && (
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <HelpCircle className="w-6 h-6" />
            </div>
          )}

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Neural Freshness Classification
            </div>
            <div className="text-xl font-black flex items-center gap-2 text-white">
              <span>{isGood ? 'GOOD - Fresh Appearance' : isBad ? 'BAD - Spoilage Detected' : 'UNCERTAIN - Inconclusive'}</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono border font-bold ${
                  isGood
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isBad
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {result.confidence}% Match
              </span>
            </div>
          </div>
        </div>

        {/* Model & Timestamp */}
        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.05]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            {result.model_used || 'Gemini 2.5 Flash'}
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Main Bento Body */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Food Details & Observations */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06]">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Identified Produce</span>
              <h3 className="text-2xl font-black text-white tracking-tight">{result.food_name}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-medium">
                {result.category}
              </span>
              {result.recommended_shelf_life_days && isGood && (
                <span className="text-xs px-3 py-1 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-mono">
                  ~{result.recommended_shelf_life_days} Days Safe Storage
                </span>
              )}
            </div>
          </div>

          {/* Visual Observations */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.05] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
              <span>Visual Diagnostics & Characteristics</span>
              <span className="text-cyan-400 font-bold">{result.confidence}% Certainty</span>
            </div>

            {/* Confidence Gauge Bar */}
            <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isGood ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : isBad ? 'bg-gradient-to-r from-rose-600 to-amber-500' : 'bg-amber-400'
                }`}
                style={{ width: `${result.confidence}%` }}
              />
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans pt-1">
              {result.observations}
            </p>

            {isUncertain && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2 mt-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Advisory:</strong> Visual evidence is ambiguous. Inspect manual firmness and aroma before consumption.
                </span>
              </div>
            )}
          </div>

          {/* Safety Disclaimer */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-black/40 border border-white/[0.05] text-[11px] text-slate-400">
            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="leading-snug">
              Assesses visible surface quality only. Does not detect invisible microscopic bacteria or core rot.
            </p>
          </div>
        </div>

        {/* Right Column: Hardware Output State & Image Preview */}
        <div className="space-y-4">
          {imageUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] max-h-36 bg-black flex items-center justify-center shadow-lg">
              <img src={imageUrl} alt="Captured Produce" className="w-full h-36 object-cover object-center" />
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] bg-black/80 backdrop-blur font-mono text-slate-300 border border-white/[0.08]">
                Captured Frame
              </div>
            </div>
          )}

          {/* LCD Render Preview */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-[#0c121e] to-black border border-white/[0.08] space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2 border-b border-white/[0.06]">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Cpu className="w-3.5 h-3.5" /> 16x2 LCD Output
              </span>
              <span className={hardwareState === 'connected' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {hardwareState === 'connected' ? 'COM3 Linked' : 'Standby'}
              </span>
            </div>

            {/* LCD Display Replica */}
            <div className="p-2.5 rounded-lg bg-[#0e1713] border border-emerald-900/40 shadow-inner font-mono text-xs select-none">
              <div className="text-emerald-400 font-bold tracking-widest truncate">
                {result.food_name.slice(0, 16)}
              </div>
              <div className="text-emerald-300 font-bold tracking-widest truncate mt-1">
                {result.condition} {result.confidence}%
              </div>
            </div>

            {/* Hardware Pin Indicators */}
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-1">
              <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-slate-500">GPIO 18</div>
                <div className={`font-bold mt-0.5 ${isGood ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {isGood ? 'GRN ON' : 'OFF'}
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-slate-500">GPIO 19</div>
                <div className={`font-bold mt-0.5 ${isBad ? 'text-rose-400' : 'text-slate-600'}`}>
                  {isBad ? 'RED ON' : 'OFF'}
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-slate-500">GPIO 23</div>
                <div className={`font-bold mt-0.5 ${isBad ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`}>
                  {isBad ? 'BEEPS' : 'MUTED'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-6 py-4 bg-slate-950/80 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-mono text-slate-300">
          {transmitStatus.type === 'success' && (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {transmitStatus.message}
            </span>
          )}
          {transmitStatus.type === 'error' && (
            <span className="text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> {transmitStatus.message}
            </span>
          )}
          {transmitStatus.type === 'idle' && (
            <span className="text-slate-400">
              {hardwareState === 'connected' ? 'Ready to sync with physical ESP32' : 'USB Disconnected · Simulator Active'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTransmit}
            disabled={isTransmitting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 ${
              hardwareState === 'connected'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isTransmitting ? 'Sending...' : 'Send to ESP32 LCD'}</span>
          </button>

          {onAddToInventory && (
            <button
              onClick={() => onAddToInventory(result)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Inventory</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
