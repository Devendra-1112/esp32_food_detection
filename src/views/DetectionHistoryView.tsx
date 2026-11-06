import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Filter,
  History,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import { DetectionRecord, FoodCondition, HardwareConnectionState } from '../types';
import { clearHistoryApi, deleteHistoryItemApi, getHistoryApi } from '../services/api';
import { webSerial } from '../services/webSerial';
import { audioBuzzer } from '../services/audioBuzzer';

interface DetectionHistoryViewProps {
  hardwareState: HardwareConnectionState;
}

export const DetectionHistoryView: React.FC<DetectionHistoryViewProps> = ({
  hardwareState,
}) => {
  const [history, setHistory] = React.useState<DetectionRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filterCondition, setFilterCondition] = React.useState<'ALL' | FoodCondition>('ALL');
  const [filterMethod, setFilterMethod] = React.useState<'ALL' | 'CAMERA' | 'IMAGE_UPLOAD' | 'MANUAL'>('ALL');
  const [activeItem, setActiveItem] = React.useState<DetectionRecord | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getHistoryApi();
      setHistory(data);
    } catch (e) {
      console.warn('Failed to fetch history:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this detection record?')) {
      await deleteHistoryItemApi(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (activeItem?.id === id) setActiveItem(null);
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear ALL detection history?')) {
      await clearHistoryApi();
      setHistory([]);
      setActiveItem(null);
    }
  };

  const handleReTransmit = async (item: DetectionRecord) => {
    try {
      if (hardwareState === 'connected') {
        await webSerial.sendResult({
          food: item.food_name,
          condition: item.condition,
          confidence: item.confidence,
        });
      } else {
        webSerial.simulateHardwareAction({
          food: item.food_name,
          condition: item.condition,
          confidence: item.confidence,
        });
      }

      if (item.condition === 'BAD') audioBuzzer.playWarningPattern();
      if (item.condition === 'GOOD') audioBuzzer.playSuccessChime();

      alert(`Re-transmitted "${item.food_name}" (${item.condition}) to ESP32!`);
    } catch (err: any) {
      alert(`Transmission failed: ${err.message}`);
    }
  };

  const filtered = history.filter((item) => {
    const matchesSearch =
      item.food_name.toLowerCase().includes(search.toLowerCase()) ||
      item.observations.toLowerCase().includes(search.toLowerCase());
    const matchesCond = filterCondition === 'ALL' || item.condition === filterCondition;
    const matchesMethod = filterMethod === 'ALL' || item.detection_method === filterMethod;
    return matchesSearch && matchesCond && matchesMethod;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            Produce Detection History
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit log of all webcam scans, image uploads, and manual food condition assessments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadHistory}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by food name or observation..."
            className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl pl-9 pr-3.5 py-2 text-xs outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Condition Filter */}
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 font-mono"
          >
            <option value="ALL">All Conditions</option>
            <option value="GOOD">GOOD Only</option>
            <option value="BAD">BAD Only</option>
            <option value="UNCERTAIN">UNCERTAIN Only</option>
          </select>

          {/* Method Filter */}
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 font-mono"
          >
            <option value="ALL">All Methods</option>
            <option value="CAMERA">Webcam Scans</option>
            <option value="IMAGE_UPLOAD">Image Uploads</option>
            <option value="MANUAL">Manual Entries</option>
          </select>
        </div>
      </div>

      {/* History Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
          No detection records found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isGood = item.condition === 'GOOD';
            const isBad = item.condition === 'BAD';

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3 shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.food_name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-xl shrink-0">
                          {item.category === 'Fruit' ? '🍎' : '🥦'}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-white">{item.food_name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.category} · {item.detection_method}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                        isGood
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isBad
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {item.condition} ({item.confidence}%)
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {item.observations}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-[10px] text-slate-500">
                    {new Date(item.detected_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReTransmit(item)}
                      title="Re-transmit to ESP32"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Delete Record"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

