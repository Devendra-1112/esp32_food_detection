import React from 'react';
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  Cpu,
  Layers,
  Radio,
  RefreshCw,
  Scan,
  Send,
  Sparkles,
  SwitchCamera,
  Video,
  Zap,
} from 'lucide-react';
import { HardwareConnectionState, VisionResult } from '../types';
import { analyzeFoodImageApi } from '../services/api';
import { ResultCard } from '../components/ResultCard';
import { InventoryModal } from '../components/InventoryModal';
import { webSerial, sendResultToESP32 } from '../services/webSerial';
import { audioBuzzer } from '../services/audioBuzzer';

interface LiveCameraViewProps {
  hardwareState: HardwareConnectionState;
  onConnectSerial: () => void;
}

export const LiveCameraView: React.FC<LiveCameraViewProps> = ({
  hardwareState,
  onConnectSerial,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string>('');
  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<VisionResult | null>(null);
  const [lastCapturedImage, setLastCapturedImage] = React.useState<string | null>(null);
  const [autoTransmit, setAutoTransmit] = React.useState(true);

  const [inventoryModalOpen, setInventoryModalOpen] = React.useState(false);

  const listCameras = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Enumerate devices failed:', e);
    }
  };

  React.useEffect(() => {
    listCameras();
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (deviceId?: string) => {
    setCameraError(null);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId || selectedDeviceId ? { exact: deviceId || selectedDeviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      await listCameras();
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera device found on this system.'
          : `Failed to open camera: ${err.message || 'Unknown error'}`
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isCameraActive) {
      startCamera(deviceId);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) {
      alert('Camera is not active. Please start camera first.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.90);
    setLastCapturedImage(base64Image);

    setIsAnalyzing(true);
    setCameraError(null);

    try {
      const resp = await analyzeFoodImageApi({
        imageBase64: base64Image,
        method: 'CAMERA',
      });

      const result = resp.analysis;
      setAnalysisResult(result);

      // Auto-transmit to ESP32
      if (autoTransmit) {
        if (hardwareState === 'connected') {
          try {
            await sendResultToESP32(result.food_name, result.condition, result.confidence);
            if (result.condition === 'BAD') audioBuzzer.playWarningPattern();
            if (result.condition === 'GOOD') audioBuzzer.playSuccessChime();
          } catch (serialErr: any) {
            console.warn('Auto-transmit to ESP32 failed:', serialErr);
          }
        } else {
          webSerial.simulateHardwareAction({
            food: result.food_name,
            condition: result.condition,
            confidence: result.confidence,
          });
          if (result.condition === 'BAD') audioBuzzer.playWarningPattern();
          if (result.condition === 'GOOD') audioBuzzer.playSuccessChime();
        }
      }
    } catch (err: any) {
      console.error('Vision analysis failed:', err);
      setCameraError(err.message || 'Vision analysis failed. Please verify API key.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Banner & Control Deck */}
      <div className="glass-card rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1 uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Optical Inspection Station
          </div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            AI Produce Scanner & Hardware Link
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multimodal visual condition analysis paired with automatic 16×2 LCD synchronization.
          </p>
        </div>

        {/* Device Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {devices.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs">
              <SwitchCamera className="w-4 h-4 text-slate-400" />
              <select
                value={selectedDeviceId}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-emerald-500 font-mono"
              >
                {devices.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isCameraActive ? (
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <CameraOff className="w-3.5 h-3.5 text-rose-400" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              onClick={() => startCamera()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/25 transition"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Start Camera Feed</span>
            </button>
          )}

          {/* Auto-transmit Switch */}
          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer select-none px-3 py-2 bg-black/40 rounded-xl border border-white/[0.08] hover:border-emerald-500/40 transition">
            <input
              type="checkbox"
              checked={autoTransmit}
              onChange={(e) => setAutoTransmit(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500/30"
            />
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-emerald-400" /> Auto-Sync to LCD
            </span>
          </label>
        </div>
      </div>

      {cameraError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{cameraError}</span>
          </div>
          <button
            onClick={() => startCamera()}
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold"
          >
            Retry Camera
          </button>
        </div>
      )}

      {/* Main Grid Viewfinder & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewfinder */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-video border-2 border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center group">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isCameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Offline Placeholder */}
            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/[0.05] shadow-xl">
                  <Video className="w-8 h-8 text-slate-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-300">Webcam Inactive</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Initiate camera stream to begin automated fruit & vegetable freshness analysis.
                  </p>
                </div>
                <button
                  onClick={() => startCamera()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
                >
                  Start Camera Feed
                </button>
              </div>
            )}

            {/* Viewfinder Laser Sweep & HUD */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between overflow-hidden">
                {/* Laser scanline */}
                <div className="viewfinder-laser" />

                {/* Top Corner Guides */}
                <div className="flex justify-between items-start z-10">
                  <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-xl shadow-[0_0_10px_#10b981]" />
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-emerald-500/40 text-[11px] font-mono text-emerald-300 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>OPTICAL SENSOR ACTIVE</span>
                  </div>
                  <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-xl shadow-[0_0_10px_#10b981]" />
                </div>

                {/* Center Target Box */}
                <div className="self-center w-56 h-56 sm:w-64 sm:h-64 border border-dashed border-emerald-400/40 rounded-3xl flex items-center justify-center relative">
                  <div className="w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400 absolute top-2 left-2" />
                  <div className="w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400 absolute top-2 right-2" />
                  <div className="w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400 absolute bottom-2 left-2" />
                  <div className="w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400 absolute bottom-2 right-2" />
                  <span className="text-[10px] font-mono text-emerald-300/80 bg-black/60 backdrop-blur px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Target Produce Area
                  </span>
                </div>

                {/* Bottom Corner Guides */}
                <div className="flex justify-between items-end z-10">
                  <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-xl shadow-[0_0_10px_#10b981]" />
                  <div className="text-[10px] font-mono text-slate-400 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-white/[0.06]">
                    Gemini 2.5 Flash Multimodal Pipeline
                  </div>
                  <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-xl shadow-[0_0_10px_#10b981]" />
                </div>
              </div>
            )}

            {/* Analysis Loading Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-[#07090e]/85 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-4 z-20">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                  <Sparkles className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="text-center">
                  <h4 className="text-base font-extrabold text-white tracking-wide">
                    Running Produce Inspection...
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Analyzing pigmentation, skin integrity, mold spores & rot
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl glass-card border border-white/[0.08]">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Scan className="w-4 h-4 text-emerald-400" />
              <span>Ensure adequate ambient lighting for optimal freshness analysis</span>
            </div>

            <button
              onClick={captureAndAnalyze}
              disabled={!isCameraActive || isAnalyzing}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Camera className="w-4 h-4" />
              <span>{isAnalyzing ? 'Analyzing Image...' : 'Capture & Analyze Food'}</span>
            </button>
          </div>
        </div>

        {/* Right: Results or Instructions */}
        <div className="lg:col-span-5 flex flex-col">
          {analysisResult ? (
            <ResultCard
              result={analysisResult}
              hardwareState={hardwareState}
              imageUrl={lastCapturedImage || undefined}
              onAddToInventory={() => setInventoryModalOpen(true)}
            />
          ) : (
            <div className="flex-1 rounded-3xl border border-white/[0.08] glass-card p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg">
                <Scan className="w-8 h-8" />
              </div>
              <div className="max-w-xs">
                <h4 className="text-base font-bold text-white">Awaiting Produce Capture</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Hold an apple, banana, tomato, or vegetable up to the camera and click{' '}
                  <strong className="text-emerald-400">Capture & Analyze</strong>.
                </p>
              </div>

              <div className="w-full text-left p-4 rounded-2xl bg-black/40 border border-white/[0.06] text-xs font-mono space-y-2">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Detection Logic:</div>
                <div className="text-emerald-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>GOOD: Green LED ON, LCD 'Apple / GOOD 94%'</span>
                </div>
                <div className="text-rose-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>BAD: Red LED ON, LCD 'Tomato / BAD 91%', Buzzer Beeps</span>
                </div>
                <div className="text-amber-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>UNCERTAIN: Both LEDs OFF, Manual check prompted</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <InventoryModal
        initialResult={analysisResult}
        isOpen={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
        onSaved={(_item) => {
          alert('Food successfully saved to Refrigerator Inventory!');
        }}
      />
    </div>
  );
};
