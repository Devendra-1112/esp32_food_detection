import React from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
  Thermometer,
  TrendingUp,
  Usb,
  Zap,
} from 'lucide-react';
import { DetectionRecord, HardwareConnectionState, InventoryItem, VisionResult } from '../types';
import { getHistoryApi, getInventoryApi } from '../services/api';
import { DigitalTwinSimulator } from '../components/DigitalTwinSimulator';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  hardwareState: HardwareConnectionState;
  onConnectSerial: () => void;
  onSelectResult: (result: VisionResult) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  hardwareState,
  onConnectSerial,
}) => {
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [history, setHistory] = React.useState<DetectionRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inv, hist] = await Promise.all([getInventoryApi(), getHistoryApi()]);
      setInventory(inv);
      setHistory(hist);
    } catch (e) {
      console.warn('Dashboard data fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const totalItems = inventory.length;
  const goodCount = inventory.filter((i) => i.condition === 'GOOD').length;
  const badCount = inventory.filter((i) => i.condition === 'BAD').length;

  const today = new Date().toISOString().split('T')[0];
  const expiringSoon = inventory.filter((item) => {
    const diffDays = Math.ceil(
      (new Date(item.expiry_date).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24)
    );
    return diffDays >= 0 && diffDays <= 3;
  });

  const expiredCount = inventory.filter((item) => item.expiry_date < today).length;

  // Compartment distributions
  const compartments = [
    { name: 'Crisper Drawer', icon: '🥗', count: inventory.filter(i => i.storage_location === 'Crisper Drawer').length, idealTemp: '4°C' },
    { name: 'Top Shelf', icon: '🥛', count: inventory.filter(i => i.storage_location === 'Top Shelf').length, idealTemp: '3°C' },
    { name: 'Middle Shelf', icon: '🍲', count: inventory.filter(i => i.storage_location === 'Middle Shelf').length, idealTemp: '3.5°C' },
    { name: 'Door Rack', icon: '🧃', count: inventory.filter(i => i.storage_location === 'Door Rack').length, idealTemp: '5°C' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Hero Welcome & Command Deck */}
      <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden border border-white/[0.08] shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono mb-2 uppercase tracking-wider font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Autonomous Freshness Monitoring & IoT Node
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Intelligent Produce Freshness & Expiry Control
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Real-time computer vision inspects pigmentation, skin firmness, and mold spores. Results are automatically piped over 115200 baud USB serial to an external ESP32 microcontroller with a 16×2 LCD and safety LED alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('camera')}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Launch AI Camera</span>
            </button>
            <button
              onClick={() => onNavigate('manual')}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-white/[0.08] shadow-lg transition hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Manual Entry</span>
            </button>
            {hardwareState !== 'connected' && (
              <button
                onClick={onConnectSerial}
                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs border border-cyan-500/30 shadow-lg transition hover:scale-105 active:scale-95 font-mono"
              >
                <Usb className="w-4 h-4" />
                <span>Link ESP32</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Metric Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="glass-card rounded-2xl p-5 border border-white/[0.08] shadow-lg glass-card-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Inventory Monitored</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{totalItems}</div>
          <div className="text-[11px] text-slate-400 mt-1.5 font-mono">
            {inventory.filter((i) => i.category === 'Fruit').length} Fruits · {inventory.filter((i) => i.category === 'Vegetable').length} Vegetables
          </div>
        </div>

        {/* Fresh Condition (GOOD) */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 shadow-lg shadow-emerald-950/20 glass-card-hover">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Fresh Condition</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400">{goodCount}</div>
          <div className="text-[11px] text-emerald-300/80 mt-1.5 font-mono">
            Green LED · High Freshness
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="glass-card rounded-2xl p-5 border border-amber-500/30 shadow-lg shadow-amber-950/20 glass-card-hover">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Expiring (≤ 3 Days)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400">{expiringSoon.length}</div>
          <div className="text-[11px] text-amber-300/80 mt-1.5 font-mono">
            Consume First Queue Active
          </div>
        </div>

        {/* Spoilage Attention */}
        <div className="glass-card rounded-2xl p-5 border border-rose-500/30 shadow-lg shadow-rose-950/20 glass-card-hover">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Attention Required</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-400">{badCount + expiredCount}</div>
          <div className="text-[11px] text-rose-300/80 mt-1.5 font-mono">
            {badCount} BAD · {expiredCount} Expired
          </div>
        </div>
      </div>

      {/* Smart Refrigerator Compartment Map */}
      <div className="glass-card rounded-3xl p-6 border border-white/[0.08]">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
              Smart Refrigerator Compartment Health
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Target Temp: 3.8°C</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {compartments.map((comp) => (
            <div
              key={comp.name}
              className="p-4 rounded-2xl bg-black/40 border border-white/[0.05] hover:border-emerald-500/30 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{comp.icon}</span>
                <div>
                  <div className="text-xs font-bold text-white">{comp.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Target: {comp.idealTemp}</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black font-mono text-emerald-400">{comp.count}</span>
                <div className="text-[9px] text-slate-500 font-mono uppercase">Items</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hardware Digital Twin Simulator */}
      <DigitalTwinSimulator onTriggerTest={() => {}} />

      {/* Grid: Expiry Priority Queue vs Recent Detections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiry Priority Queue */}
        <div className="glass-card rounded-3xl p-6 border border-white/[0.08] flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                  Expiry Priority Queue (Consume First)
                </h3>
              </div>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition font-medium"
              >
                View Full Inventory →
              </button>
            </div>

            {inventory.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic font-mono">
                No items in inventory. Scan produce to populate.
              </div>
            ) : (
              <div className="space-y-3">
                {inventory.slice(0, 4).map((item) => {
                  const diffDays = Math.ceil(
                    (new Date(item.expiry_date).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24)
                  );
                  const isExpired = diffDays < 0;
                  const isUrgent = diffDays >= 0 && diffDays <= 3;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/[0.05] hover:border-white/[0.12] transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {item.category === 'Fruit' ? '🍎' : item.category === 'Vegetable' ? '🥦' : '🍱'}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.quantity} · {item.storage_location}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                            isExpired
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isUrgent
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {isExpired ? 'EXPIRED' : diffDays === 0 ? 'EXPIRES TODAY' : `${diffDays}d left`}
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Expires: {item.expiry_date}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Sorting: Nearest expiry first</span>
            <span className="text-emerald-400 font-mono font-semibold">Zero-Waste Engine Active</span>
          </div>
        </div>

        {/* Recent Detection History */}
        <div className="glass-card rounded-3xl p-6 border border-white/[0.08] flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                  Recent AI Detections
                </h3>
              </div>
              <button
                onClick={() => onNavigate('history')}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition font-medium"
              >
                View History Log →
              </button>
            </div>

            {history.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic font-mono">
                No recent detections. Open Camera to scan produce.
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 4).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/[0.05]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          record.condition === 'GOOD'
                            ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                            : record.condition === 'BAD'
                            ? 'bg-rose-500 shadow-[0_0_8px_#ef4444]'
                            : 'bg-amber-400'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{record.food_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {record.category} · {record.confidence}% Conf · {record.detection_method}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                          record.condition === 'GOOD'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : record.condition === 'BAD'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {record.condition}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {new Date(record.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>ESP32 Ready</span>
            </span>
            <button
              onClick={loadData}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px] font-mono transition"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
