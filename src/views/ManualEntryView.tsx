import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Package,
  PlusCircle,
  Send,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { FoodCategory, FoodCondition, HardwareConnectionState, VisionResult } from '../types';
import { addInventoryItemApi, addManualHistoryApi } from '../services/api';
import { webSerial } from '../services/webSerial';
import { audioBuzzer } from '../services/audioBuzzer';
import { ResultCard } from '../components/ResultCard';

interface ManualEntryViewProps {
  hardwareState: HardwareConnectionState;
  onConnectSerial: () => void;
}

export const ManualEntryView: React.FC<ManualEntryViewProps> = ({
  hardwareState,
  onConnectSerial,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const [foodName, setFoodName] = React.useState('');
  const [category, setCategory] = React.useState<FoodCategory>('Fruit');
  const [purchaseDate, setPurchaseDate] = React.useState(today);
  const [expiryDate, setExpiryDate] = React.useState(nextWeek);
  const [quantity, setQuantity] = React.useState('1 unit');
  const [storageLocation, setStorageLocation] = React.useState('Crisper Drawer');
  const [condition, setCondition] = React.useState<FoodCondition>('GOOD');
  const [notes, setNotes] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [generatedResult, setGeneratedResult] = React.useState<VisionResult | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<{ text: string; isError: boolean } | null>(null);

  const handleAnalyzeFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) {
      setStatusMessage({ text: 'Please enter a food name.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const confidence = condition === 'GOOD' ? 95 : condition === 'BAD' ? 92 : 60;
    const observationText =
      notes.trim() ||
      (condition === 'GOOD'
        ? 'Manual inspection: Produce appears fresh with normal skin and firmness.'
        : condition === 'BAD'
        ? 'Manual inspection: Visible deterioration, mold, or spoilage noted.'
        : 'Manual inspection: Condition uncertain; recommended for close monitoring.');

    const newResult: VisionResult = {
      food_name: foodName.trim(),
      category,
      condition,
      confidence,
      observations: observationText,
      model_used: 'Manual Inspection Mode',
      timestamp: new Date().toISOString(),
      recommended_shelf_life_days: condition === 'GOOD' ? 7 : 0,
    };

    setGeneratedResult(newResult);

    try {
      // 1. Save to Inventory
      await addInventoryItemApi({
        user_id: 'user_default',
        name: foodName.trim(),
        category,
        quantity,
        purchase_date: purchaseDate,
        expiry_date: expiryDate,
        condition,
        storage_location: storageLocation,
        notes: observationText,
      });

      // 2. Transmit to ESP32 if connected
      let hwStatus: 'SENT_AND_ACK' | 'NOT_CONNECTED' | 'FAILED' = 'NOT_CONNECTED';
      if (hardwareState === 'connected') {
        try {
          await webSerial.sendResult({
            food: foodName.trim(),
            condition,
            confidence,
          });
          hwStatus = 'SENT_AND_ACK';
          if (condition === 'BAD') audioBuzzer.playWarningPattern();
          if (condition === 'GOOD') audioBuzzer.playSuccessChime();
        } catch (err) {
          hwStatus = 'FAILED';
          console.warn('Manual send to ESP32 failed:', err);
        }
      } else {
        // Mirror to simulator
        webSerial.simulateHardwareAction({
          food: foodName.trim(),
          condition,
          confidence,
        });
        if (condition === 'BAD') audioBuzzer.playWarningPattern();
        if (condition === 'GOOD') audioBuzzer.playSuccessChime();
      }

      // 3. Record in Detection History
      await addManualHistoryApi({
        user_id: 'user_default',
        food_name: foodName.trim(),
        category,
        condition,
        confidence,
        observations: observationText,
        detection_method: 'MANUAL',
        hardware_status: hwStatus,
      });

      setStatusMessage({
        text: `Successfully analyzed and saved "${foodName}". ${
          hwStatus === 'SENT_AND_ACK' ? 'Transmitted to ESP32.' : 'Hardware mirrored in simulator.'
        }`,
        isError: false,
      });
    } catch (err: any) {
      setStatusMessage({
        text: `Error saving item: ${err.message}`,
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-400" />
          Manual Food Inspection & Hardware Transmission
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manually enter produce details when camera access is unavailable or for non-visual verification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Form */}
        <div className="lg:col-span-7">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl mb-4 text-xs flex items-center gap-2 ${
                  statusMessage.isError
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                }`}
              >
                {statusMessage.isError ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleAnalyzeFood} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Food Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="e.g. Apple, Banana, Tomato, Spinach, Cucumber"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Food Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FoodCategory)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 5 units, 1 kg"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Storage Compartment
                  </label>
                  <select
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="Crisper Drawer">Crisper Drawer (Produce)</option>
                    <option value="Top Shelf">Top Shelf (Ready-to-eat)</option>
                    <option value="Middle Shelf">Middle Shelf (General)</option>
                    <option value="Door Rack">Door Rack (Condiments/Drinks)</option>
                    <option value="Freezer">Freezer</option>
                    <option value="Pantry">Pantry</option>
                  </select>
                </div>

                {/* Visible Condition Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Visible Condition *
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as FoodCondition)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-emerald-500"
                  >
                    <option value="GOOD">GOOD (Green LED ON, LCD GOOD)</option>
                    <option value="BAD">BAD (Red LED ON, Buzzer ON)</option>
                    <option value="UNCERTAIN">UNCERTAIN (LEDs OFF, LCD UNCERTAIN)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Inspection Notes / Observations
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter manual observations (e.g. firm texture, no mold, or signs of discoloration)..."
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">
                  {hardwareState === 'connected' ? 'ESP32 Connected via USB' : 'ESP32 Disconnected (Will mirror in simulator)'}
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Analyzing & Transmitting...' : 'Analyze Food'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Generated Result Card */}
        <div className="lg:col-span-5">
          {generatedResult ? (
            <ResultCard
              result={generatedResult}
              hardwareState={hardwareState}
              onSendSuccess={() => {}}
            />
          ) : (
            <div className="h-full rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800 text-slate-400">
                <Package className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Manual Verification Ready</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Fill in the food name and condition, then click <strong>Analyze Food</strong> to send the telemetry to the ESP32.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

