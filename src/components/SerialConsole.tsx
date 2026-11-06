import React from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Copy,
  Info,
  Play,
  RotateCcw,
  Send,
  Terminal,
  Trash2,
  Usb,
} from 'lucide-react';
import { HardwareConnectionState, SerialLogEntry } from '../types';
import { webSerial } from '../services/webSerial';
import { audioBuzzer } from '../services/audioBuzzer';

interface SerialConsoleProps {
  hardwareState: HardwareConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const SerialConsole: React.FC<SerialConsoleProps> = ({
  hardwareState,
  onConnect,
  onDisconnect,
}) => {
  const [logs, setLogs] = React.useState<SerialLogEntry[]>([]);
  const [baudRate, setBaudRate] = React.useState(webSerial.getBaudRate());
  const [customJson, setCustomJson] = React.useState(
    '{"food":"Apple","condition":"GOOD","confidence":95}'
  );
  const [isSending, setIsSending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const terminalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const unsub = webSerial.onLog((entry) => {
      setLogs((prev) => [...prev.slice(-150), entry]);
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleBaudChange = (rate: number) => {
    setBaudRate(rate);
    webSerial.setBaudRate(rate);
  };

  const sendCommand = async (payload: { food: string; condition: 'GOOD' | 'BAD' | 'UNCERTAIN'; confidence: number }) => {
    setIsSending(true);
    try {
      if (hardwareState === 'connected') {
        await webSerial.sendResult(payload);
      } else {
        webSerial.simulateHardwareAction(payload);
      }
      if (payload.condition === 'BAD') {
        audioBuzzer.playWarningPattern();
      } else if (payload.condition === 'GOOD') {
        audioBuzzer.playSuccessChime();
      }
    } catch (err: any) {
      console.error('Command failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendCustom = () => {
    try {
      const parsed = JSON.parse(customJson);
      if (!parsed.food || !parsed.condition) {
        alert('Invalid JSON: Must include "food" and "condition" properties.');
        return;
      }
      sendCommand({
        food: parsed.food,
        condition: parsed.condition.toUpperCase(),
        confidence: Number(parsed.confidence) || 90,
      });
    } catch {
      alert('Invalid JSON syntax');
    }
  };

  const clearLogs = () => setLogs([]);

  const copyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-5 shadow-2xl flex flex-col h-full">
      {/* Header & Connection Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Usb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              USB Serial Connection Manager
            </h3>
            <p className="text-xs text-slate-400">Web Serial API to ESP32 Hardware</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Baud Rate Selector */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400">Baud:</span>
            <select
              value={baudRate}
              disabled={hardwareState === 'connected'}
              onChange={(e) => handleBaudChange(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-cyan-500"
            >
              <option value={115200}>115200 (Default)</option>
              <option value={57600}>57600</option>
              <option value={9600}>9600</option>
            </select>
          </div>

          {/* Connect / Disconnect Action */}
          {hardwareState === 'connected' ? (
            <button
              onClick={onDisconnect}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={hardwareState === 'connecting'}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/30 transition flex items-center gap-1.5"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>{hardwareState === 'connecting' ? 'Opening Port...' : 'Connect ESP32'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Test Bar */}
      <div className="py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80">
        <span className="text-xs text-slate-400 font-mono">Hardware Quick-Test Packets:</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => sendCommand({ food: 'Apple', condition: 'GOOD', confidence: 96 })}
            disabled={isSending}
            className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono transition"
          >
            TX GOOD (Apple)
          </button>
          <button
            onClick={() => sendCommand({ food: 'Tomato', condition: 'BAD', confidence: 92 })}
            disabled={isSending}
            className="px-2.5 py-1 text-xs rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono transition"
          >
            TX BAD (Tomato)
          </button>
          <button
            onClick={() => sendCommand({ food: 'Banana', condition: 'UNCERTAIN', confidence: 50 })}
            disabled={isSending}
            className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono transition"
          >
            TX UNCERTAIN (Banana)
          </button>
        </div>
      </div>

      {/* Live Terminal / Serial Monitor */}
      <div className="mt-3 flex-1 flex flex-col min-h-[220px]">
        <div className="flex items-center justify-between pb-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Serial Traffic Monitor (TX / RX)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLogs}
              title="Copy Serial Log"
              className="p-1 hover:text-slate-200 transition text-slate-400"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={clearLogs}
              title="Clear Terminal"
              className="p-1 hover:text-rose-400 transition text-slate-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          ref={terminalRef}
          className="flex-1 p-3 rounded-xl bg-black/80 border border-slate-800/80 font-mono text-xs overflow-y-auto space-y-1 select-text h-48"
        >
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">No serial traffic yet. Connect ESP32 or send a test command...</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                {log.type === 'tx' && (
                  <span className="text-cyan-400 font-bold shrink-0 flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" /> TX:
                  </span>
                )}
                {log.type === 'rx' && (
                  <span className="text-emerald-400 font-bold shrink-0 flex items-center gap-0.5">
                    <ArrowDownLeft className="w-3 h-3" /> RX:
                  </span>
                )}
                {log.type === 'info' && (
                  <span className="text-blue-400 shrink-0 flex items-center gap-0.5">
                    <Info className="w-3 h-3" /> INFO:
                  </span>
                )}
                {log.type === 'error' && (
                  <span className="text-rose-400 font-bold shrink-0 flex items-center gap-0.5">
                    <AlertCircle className="w-3 h-3" /> ERR:
                  </span>
                )}
                <span
                  className={
                    log.type === 'tx'
                      ? 'text-cyan-200 break-all'
                      : log.type === 'rx'
                      ? 'text-emerald-200 break-all'
                      : log.type === 'error'
                      ? 'text-rose-300 break-all'
                      : 'text-slate-300 break-all'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Custom Command Input */}
      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={customJson}
          onChange={(e) => setCustomJson(e.target.value)}
          placeholder='{"food":"Mango","condition":"GOOD","confidence":90}'
          className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-cyan-500"
        />
        <button
          onClick={handleSendCustom}
          disabled={isSending}
          className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};

