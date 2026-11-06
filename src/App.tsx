import React, { useState, useEffect } from 'react';
import { HardwareConnectionState, VisionResult } from './types';
import { webSerial } from './services/webSerial';
import { Navbar } from './components/Navbar';
import { DashboardView } from './views/DashboardView';
import { LiveCameraView } from './views/LiveCameraView';
import { ManualEntryView } from './views/ManualEntryView';
import { ImageUploadView } from './views/ImageUploadView';
import { DetectionHistoryView } from './views/DetectionHistoryView';
import { InventoryView } from './views/InventoryView';
import { HardwareControlView } from './views/HardwareControlView';
import { SettingsView } from './views/SettingsView';

export function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [hardwareState, setHardwareState] = useState<HardwareConnectionState>('disconnected');
  const [notification, setNotification] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    const unsub = webSerial.onStatusChange((status) => {
      setHardwareState(status);
    });

    const unsubLog = webSerial.onLog((entry) => {
      if (entry.type === 'error') {
        setNotification({ type: 'error', message: entry.message });
        setTimeout(() => setNotification(null), 5000);
      } else if (entry.type === 'info' && entry.message.includes('opened successfully')) {
        setNotification({ type: 'success', message: 'ESP32 Serial Port connected!' });
        setTimeout(() => setNotification(null), 4000);
      }
    });

    return () => {
      unsub();
      unsubLog();
    };
  }, []);

  const handleConnectSerial = async () => {
    try {
      await webSerial.connect();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to connect ESP32. Make sure Web Serial is supported (Chrome/Edge).',
      });
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const handleDisconnectSerial = async () => {
    await webSerial.disconnect();
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        hardwareState={hardwareState}
        onConnectSerial={handleConnectSerial}
        onDisconnectSerial={handleDisconnectSerial}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-4 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-medium flex items-center gap-2.5 backdrop-blur-md ${
              notification.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-950/40'
                : notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-950/40'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                notification.type === 'error'
                  ? 'bg-rose-400'
                  : notification.type === 'success'
                  ? 'bg-emerald-400'
                  : 'bg-blue-400'
              }`}
            />
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'dashboard' && (
          <DashboardView
            onNavigate={setCurrentView}
            hardwareState={hardwareState}
            onConnectSerial={handleConnectSerial}
            onSelectResult={() => {}}
          />
        )}

        {currentView === 'camera' && (
          <LiveCameraView
            hardwareState={hardwareState}
            onConnectSerial={handleConnectSerial}
          />
        )}

        {currentView === 'manual' && (
          <ManualEntryView
            hardwareState={hardwareState}
            onConnectSerial={handleConnectSerial}
          />
        )}

        {currentView === 'upload' && (
          <ImageUploadView
            hardwareState={hardwareState}
            onConnectSerial={handleConnectSerial}
          />
        )}

        {currentView === 'history' && (
          <DetectionHistoryView
            hardwareState={hardwareState}
          />
        )}

        {currentView === 'inventory' && <InventoryView />}

        {currentView === 'hardware' && (
          <HardwareControlView
            hardwareState={hardwareState}
            onConnectSerial={handleConnectSerial}
            onDisconnectSerial={handleDisconnectSerial}
          />
        )}

        {currentView === 'settings' && <SettingsView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 bg-[#080c14]/80 text-[11px] text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Expiry First Refrigerator · Software & ESP32 Hardware Academic Prototype
          </div>
          <div className="flex items-center gap-4">
            <span>Baud: 115200</span>
            <span>·</span>
            <span>Web Serial API</span>
            <span>·</span>
            <span>Gemini Vision</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
