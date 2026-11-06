import React from 'react';
import { Calendar, Check, Package, X } from 'lucide-react';
import { FoodCategory, FoodCondition, InventoryItem, VisionResult } from '../types';
import { addInventoryItemApi } from '../services/api';

interface InventoryModalProps {
  initialResult?: VisionResult | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (item: InventoryItem) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  initialResult,
  isOpen,
  onClose,
  onSaved,
}) => {
  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];

  // Default suggested expiry date based on recommended shelf life, but editable
  const defaultExpiry = React.useMemo(() => {
    const days = initialResult?.recommended_shelf_life_days || 5;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }, [initialResult]);

  const [name, setName] = React.useState(initialResult?.food_name || '');
  const [category, setCategory] = React.useState<FoodCategory>(initialResult?.category || 'Fruit');
  const [quantity, setQuantity] = React.useState('1 unit');
  const [purchaseDate, setPurchaseDate] = React.useState(today);
  const [expiryDate, setExpiryDate] = React.useState(defaultExpiry);
  const [condition, setCondition] = React.useState<FoodCondition>(initialResult?.condition || 'GOOD');
  const [location, setLocation] = React.useState('Crisper Drawer');
  const [notes, setNotes] = React.useState(initialResult?.observations || '');
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a food name');
      return;
    }
    if (!expiryDate) {
      setError('Please set an explicit expiry date');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const saved = await addInventoryItemApi({
        user_id: 'user_default',
        name: name.trim(),
        category,
        quantity,
        purchase_date: purchaseDate,
        expiry_date: expiryDate,
        condition,
        storage_location: location,
        notes,
      });
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add Food to Refrigerator Inventory</h3>
              <p className="text-xs text-slate-400">Track shelf-life and prioritize expiring items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Food Item Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fuji Apple, Roma Tomato"
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FoodCategory)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500"
              >
                <option value="Fruit">Fruit</option>
                <option value="Vegetable">Vegetable</option>
                <option value="Dairy">Dairy</option>
                <option value="Bakery">Bakery</option>
                <option value="Meat">Meat</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Quantity</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 4 units, 500g"
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Expiry Date * <span className="text-[10px] text-amber-400">(Confirm Explicitly)</span>
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-slate-950 border border-amber-500/50 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Storage Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500"
              >
                <option value="Crisper Drawer">Crisper Drawer (Produce)</option>
                <option value="Top Shelf">Top Shelf (Ready to Eat)</option>
                <option value="Middle Shelf">Middle Shelf (General)</option>
                <option value="Bottom Shelf">Bottom Shelf</option>
                <option value="Door Rack">Door Rack (Condiments/Beverages)</option>
                <option value="Freezer">Freezer</option>
                <option value="Pantry">Pantry Shelf</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Condition Status</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as FoodCondition)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500"
              >
                <option value="GOOD">GOOD (Fresh)</option>
                <option value="BAD">BAD (Spoiled)</option>
                <option value="UNCERTAIN">UNCERTAIN (Inspect)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Notes / Visual Observations</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observed firmness, color, or packaging notes..."
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Confirm & Add to Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

