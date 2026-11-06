import React from 'react';
import {
  CheckCircle2,
  Cpu,
  Key,
  RefreshCw,
  Save,
  Server,
  Settings,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { checkBackendHealth } from '../services/api';
import { audioBuzzer } from '../services/audioBuzzer';
import { webSerial } from '../services/webSerial';

export const SettingsView: React.FC = () => {
  const [geminiApiKey, setGeminiApiKey] = React.useState(
    localStorage.getItem('user_gemini_key') || ''
  );
  const [model, setModel] = React.useState(
    localStorage.getItem('preferred_model') || 'gemini-2.5-flash'
  );
  const [baudRate, setBaudRate] = React.useState(webSerial.getBaudRate());
  const [isMuted, setIsMuted] = React.useState(audioBuzzer.getMuted());

  const [healthStatus, setHealthStatus] = React.useState<{
    checked: boolean;
    healthy: boolean;
    hasKey: boolean;
    engine: string;
  }>({ checked: false, healthy: false, hasKey: false, engine: '' });

  const [saving, setSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState('');

  const runHealthCheck = async () => {
    try {
      const h = await checkBackendHealth();
      setHealthStatus({
        checked: true,
        healthy: h.status === 'healthy',
        hasKey: h.has_api_key,
        engine: h.vision_engine,
      });
    } catch {
      setHealthStatus({
        checked: true,
        healthy: false,
        hasKey: false,
        engine: 'Unreachable',
      });
    }
  };

  React.useEffect(() => {
    runHealthCheck();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (geminiApiKey.trim()) {
      localStorage.setItem('user_gemini_key', geminiApiKey.trim());
    } else {
      localStorage.removeItem('user_gemini_key');
    }

    localStorage.setItem('preferred_model', model);
    webSerial.setBaudRate(baudRate);
    audioBuzzer.setMuted(isMuted);

    setTimeout(() => {
      setSaving(false);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
      runHealthCheck();
    }, 400);
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          System Configuration & Model Settings
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure computer vision models, API credentials, Web Serial defaults, and audio simulator.
        </p>
      </div>

      {/* Backend Health Diagnostics */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl border ${
              healthStatus.healthy
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase text-slate-400">Backend API Gateway</div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{healthStatus.healthy ? 'Connected (Port 3001)' : 'Offline / Checking...'}</span>
              {healthStatus.hasKey && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  GEMINI_API_KEY Active
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={runHealthCheck}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Ping Gateway</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Computer Vision Settings Card */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Computer Vision & AI Provider
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Google Gemini API Key (Optional Override)</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Default server key is already loaded from environment
                </span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy... (leave blank to use system default key)"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Keys are stored securely in memory/localStorage and sent only to the backend proxy.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Multimodal Vision Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none focus:border-emerald-500"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-fast, High Accuracy - Recommended)</option>
                <option value="gemini-flash-latest">Gemini Flash Latest</option>
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Hardware & Serial Defaults */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              ESP32 USB Serial Communication
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Serial Baud Rate
              </label>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none focus:border-cyan-500"
              >
                <option value={115200}>115200 baud (ESP32 Standard)</option>
                <option value={57600}>57600 baud</option>
                <option value={9600}>9600 baud</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Web Audio Buzzer Simulator
              </label>
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-semibold transition ${
                  !isMuted
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-950 text-slate-400 border-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  {!isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{isMuted ? 'Simulator Audio Muted' : 'Audio Enabled (Piezo Buzzer)'}</span>
                </span>
                <span className="text-[10px] uppercase font-mono">{isMuted ? 'OFF' : 'ON'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {saveMessage && (
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {saveMessage}
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

