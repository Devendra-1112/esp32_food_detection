import React from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Edit2,
  FileImage,
  Image as ImageIcon,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react';
import { FoodCategory, FoodCondition, HardwareConnectionState, VisionResult } from '../types';
import { analyzeFoodImageApi } from '../services/api';
import { ResultCard } from '../components/ResultCard';
import { InventoryModal } from '../components/InventoryModal';
import { webSerial } from '../services/webSerial';
import { audioBuzzer } from '../services/audioBuzzer';

interface ImageUploadViewProps {
  hardwareState: HardwareConnectionState;
  onConnectSerial: () => void;
}

export const ImageUploadView: React.FC<ImageUploadViewProps> = ({
  hardwareState,
}) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<VisionResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Correction Mode state
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editCategory, setEditCategory] = React.useState<FoodCategory>('Fruit');
  const [editCondition, setEditCondition] = React.useState<FoodCondition>('GOOD');

  const [confirmed, setConfirmed] = React.useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setAnalysisResult(null);
    setConfirmed(false);
    setIsEditing(false);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const resp = await analyzeFoodImageApi({
        file: selectedFile,
        method: 'IMAGE_UPLOAD',
      });

      const res = resp.analysis;
      setAnalysisResult(res);
      setEditName(res.food_name);
      setEditCategory(res.category);
      setEditCondition(res.condition);
    } catch (err: any) {
      setError(err.message || 'Image analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAndTransmit = async () => {
    if (!analysisResult) return;

    const finalResult: VisionResult = {
      ...analysisResult,
      food_name: editName.trim() || analysisResult.food_name,
      category: editCategory,
      condition: editCondition,
    };

    setAnalysisResult(finalResult);
    setConfirmed(true);
    setIsEditing(false);

    try {
      if (hardwareState === 'connected') {
        await webSerial.sendResult({
          food: finalResult.food_name,
          condition: finalResult.condition,
          confidence: finalResult.confidence,
        });
      } else {
        webSerial.simulateHardwareAction({
          food: finalResult.food_name,
          condition: finalResult.condition,
          confidence: finalResult.confidence,
        });
      }

      if (finalResult.condition === 'BAD') audioBuzzer.playWarningPattern();
      if (finalResult.condition === 'GOOD') audioBuzzer.playSuccessChime();
    } catch (e) {
      console.warn('Hardware transmission error:', e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-emerald-400" />
          Image Upload & Produce Analysis
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Upload food photos (JPG, PNG, WEBP), review or edit model results, and transmit directly to ESP32.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Drag & Drop Dropzone */}
        <div className="lg:col-span-6 space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="p-8 rounded-3xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/40 hover:bg-slate-900/70 transition-all cursor-pointer flex flex-col items-center justify-center text-center group min-h-[280px]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="space-y-3 w-full flex flex-col items-center">
                <img
                  src={previewUrl}
                  alt="Food Preview"
                  className="max-h-64 rounded-xl object-contain shadow-lg border border-slate-700"
                />
                <span className="text-xs text-slate-400 group-hover:text-emerald-400 transition font-mono">
                  Click or drag another image to replace
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform border border-emerald-500/20">
                  <FileImage className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Drop your produce image here</h4>
                  <p className="text-xs text-slate-400 mt-1">or browse from your local files</p>
                </div>
                <div className="text-[11px] font-mono text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 inline-block">
                  JPG · JPEG · PNG · WEBP (Up to 25MB)
                </div>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-300 font-mono truncate max-w-xs">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAnalyzing ? 'Analyzing Image...' : 'Analyze Food'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Results, Confirmation & Correction UI */}
        <div className="lg:col-span-6 space-y-4">
          {analysisResult ? (
            <div className="space-y-4">
              {/* Correction / Confirmation Card */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                      Model Classification Review
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Cancel Edit' : 'Correct / Edit'}</span>
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Food Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Category
                        </label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as FoodCategory)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-cyan-500"
                        >
                          <option value="Fruit">Fruit</option>
                          <option value="Vegetable">Vegetable</option>
                          <option value="Dairy">Dairy</option>
                          <option value="Bakery">Bakery</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Condition
                        </label>
                        <select
                          value={editCondition}
                          onChange={(e) => setEditCondition(e.target.value as FoodCondition)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-cyan-500"
                        >
                          <option value="GOOD">GOOD (Fresh)</option>
                          <option value="BAD">BAD (Spoiled)</option>
                          <option value="UNCERTAIN">UNCERTAIN</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Identified:</span>
                      <span className="font-bold text-white">{analysisResult.food_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Condition:</span>
                      <span
                        className={`font-bold ${
                          analysisResult.condition === 'GOOD'
                            ? 'text-emerald-400'
                            : analysisResult.condition === 'BAD'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {analysisResult.condition}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Confidence:</span>
                      <span className="text-slate-200">{analysisResult.confidence}%</span>
                    </div>
                  </div>
                )}

                {/* Confirm & Transmit button */}
                <button
                  onClick={handleConfirmAndTransmit}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Confirm & Transmit Result to ESP32</span>
                </button>
              </div>

              {/* Result Card preview */}
              <ResultCard
                result={analysisResult}
                hardwareState={hardwareState}
                imageUrl={previewUrl || undefined}
                onAddToInventory={() => setInventoryModalOpen(true)}
              />
            </div>
          ) : (
            <div className="h-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800 text-slate-400">
                <ImageIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-white">No Image Analyzed</h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Upload a produce photo to inspect its visual condition, check confidence scores, and sync to hardware.
              </p>
            </div>
          )}
        </div>
      </div>

      <InventoryModal
        initialResult={analysisResult}
        isOpen={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
        onSaved={() => alert('Food added to Refrigerator Inventory!')}
      />
    </div>
  );
};

