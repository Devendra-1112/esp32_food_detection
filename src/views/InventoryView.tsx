import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { FoodCategory, FoodCondition, InventoryItem } from '../types';
import { deleteInventoryItemApi, getInventoryApi, updateInventoryItemApi } from '../services/api';
import { InventoryModal } from '../components/InventoryModal';

export const InventoryView: React.FC = () => {
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectedLocation, setSelectedLocation] = React.useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('ALL');
  const [modalOpen, setModalOpen] = React.useState(false);

  const today = new Date().toISOString().split('T')[0];

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await getInventoryApi();
      setItems(data);
    } catch (e) {
      console.warn('Failed to load inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadInventory();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Remove "${name}" from inventory?`)) {
      await deleteInventoryItemApi(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleQuickStatusChange = async (id: string, newCondition: FoodCondition) => {
    try {
      const updated = await updateInventoryItemApi(id, { condition: newCondition });
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(search.toLowerCase());
    const matchesLoc = selectedLocation === 'ALL' || item.storage_location === selectedLocation;
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesLoc && matchesCat;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Expiry First Inventory Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organized strictly by expiration priority to minimize food waste and optimize consumption.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadInventory}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Food Item</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by food name or notes..."
            className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl pl-9 pr-3.5 py-2 text-xs outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Storage Compartment Filter */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 font-mono"
          >
            <option value="ALL">All Storage Areas</option>
            <option value="Crisper Drawer">Crisper Drawer</option>
            <option value="Top Shelf">Top Shelf</option>
            <option value="Middle Shelf">Middle Shelf</option>
            <option value="Door Rack">Door Rack</option>
            <option value="Freezer">Freezer</option>
            <option value="Pantry">Pantry</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 font-mono"
          >
            <option value="ALL">All Categories</option>
            <option value="Fruit">Fruits</option>
            <option value="Vegetable">Vegetables</option>
            <option value="Dairy">Dairy</option>
            <option value="Bakery">Bakery</option>
            <option value="Meat">Meat</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Inventory Cards Grid (Sorted Expiry First) */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
          No food items found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const diffDays = Math.ceil(
              (new Date(item.expiry_date).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24)
            );
            const isExpired = diffDays < 0;
            const isUrgent = diffDays >= 0 && diffDays <= 3;
            const isGood = item.condition === 'GOOD';

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 shadow-xl ${
                  isExpired
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500'
                    : isUrgent
                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top line: Name & Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-base font-bold text-white tracking-tight">{item.name}</h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        {item.quantity} · {item.storage_location}
                      </span>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                        isExpired
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          : isUrgent
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isExpired
                        ? `EXPIRED (${Math.abs(diffDays)}d ago)`
                        : diffDays === 0
                        ? 'EXPIRES TODAY'
                        : `${diffDays} days remaining`}
                    </span>
                  </div>

                  {/* Dates & Location */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Purchased:</span>
                      <span className="text-slate-200">{item.purchase_date}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Expiry Date:</span>
                      <span
                        className={`font-bold ${
                          isExpired
                            ? 'text-rose-400'
                            : isUrgent
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {item.expiry_date}
                      </span>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 italic">
                      "{item.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-mono">Condition:</span>
                    <button
                      onClick={() =>
                        handleQuickStatusChange(
                          item.id,
                          item.condition === 'GOOD' ? 'BAD' : 'GOOD'
                        )
                      }
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border transition ${
                        isGood
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      }`}
                      title="Click to toggle condition"
                    >
                      {item.condition}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
                      title="Mark Consumed / Remove"
                    >
                      Consumed / Discard
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      <InventoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(item) => setItems((prev) => [item, ...prev])}
      />
    </div>
  );
};

