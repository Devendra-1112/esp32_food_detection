import {
  HardwareConnectionState,
  SerialAckPayload,
  SerialCommandPayload,
  SerialLogEntry,
  FoodCondition,
} from '../types';

type StatusListener = (state: HardwareConnectionState) => void;
type LogListener = (entry: SerialLogEntry) => void;
type HardwareStateListener = (state: {
  displayLine1: string;
  displayLine2: string;
  greenLed: boolean;
  redLed: boolean;
  buzzer: boolean;
}) => void;

class WebSerialService {
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private readableStreamClosed: Promise<void> | null = null;
  private writableStreamClosed: Promise<void> | null = null;
  private connectionState: HardwareConnectionState = 'disconnected';
  private baudRate: number = 115200;

  private statusListeners: StatusListener[] = [];
  private logListeners: LogListener[] = [];
  private hardwareStateListeners: HardwareStateListener[] = [];

  private lineBuffer: string = '';
  private pendingAckResolvers: Array<{
    resolve: (ack: SerialAckPayload) => void;
    reject: (err: Error) => void;
    timer: any;
  }> = [];

  public lastCommandSent: SerialCommandPayload | null = null;
  public lastAckReceived: SerialAckPayload | null = null;

  public hardwareState = {
    displayLine1: 'READY TO SCAN',
    displayLine2: 'SYSTEM STANDBY',
    greenLed: false,
    redLed: false,
    buzzer: false,
  };

  constructor() {
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      (navigator as any).serial.addEventListener('disconnect', (_event: any) => {
        this.addLog('info', 'ESP32 disconnected by physical removal');
        this.disconnect();
      });
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'serial' in navigator;
  }

  setBaudRate(rate: number) {
    this.baudRate = rate;
  }

  getBaudRate(): number {
    return this.baudRate;
  }

  getConnectionState(): HardwareConnectionState {
    return this.connectionState;
  }

  onStatusChange(cb: StatusListener): () => void {
    this.statusListeners.push(cb);
    cb(this.connectionState);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb);
    };
  }

  onLog(cb: LogListener): () => void {
    this.logListeners.push(cb);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== cb);
    };
  }

  onHardwareState(cb: HardwareStateListener): () => void {
    this.hardwareStateListeners.push(cb);
    cb(this.hardwareState);
    return () => {
      this.hardwareStateListeners = this.hardwareStateListeners.filter((l) => l !== cb);
    };
  }

  private setStatus(status: HardwareConnectionState) {
    this.connectionState = status;
    this.statusListeners.forEach((l) => l(status));
  }

  private addLog(type: SerialLogEntry['type'], message: string) {
    const entry: SerialLogEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    this.logListeners.forEach((l) => l(entry));
  }

  private updateHardwareState(condition: FoodCondition, foodName: string, confidence?: number) {
    const confStr = confidence ? ` ${Math.round(confidence)}%` : '';
    if (condition === 'GOOD') {
      this.hardwareState = {
        displayLine1: foodName.slice(0, 16),
        displayLine2: `GOOD${confStr}`,
        greenLed: true,
        redLed: false,
        buzzer: false,
      };
    } else if (condition === 'BAD') {
      this.hardwareState = {
        displayLine1: foodName.slice(0, 16),
        displayLine2: `BAD${confStr}`,
        greenLed: false,
        redLed: true,
        buzzer: true,
      };
    } else {
      this.hardwareState = {
        displayLine1: foodName.slice(0, 16),
        displayLine2: `UNCERTAIN${confStr}`,
        greenLed: false,
        redLed: false,
        buzzer: false,
      };
    }
    this.hardwareStateListeners.forEach((l) => l(this.hardwareState));
  }

  async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      const err = 'Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.';
      this.addLog('error', err);
      throw new Error(err);
    }

    try {
      this.setStatus('connecting');
      this.addLog('info', `Requesting Serial Port from user (Baud: ${this.baudRate})...`);

      // Prompt user to select ESP32 COM port
      this.port = await (navigator as any).serial.requestPort();

      // Open the port
      await this.port.open({ baudRate: this.baudRate });
      this.setStatus('connected');
      this.addLog('info', `Serial Port opened successfully at ${this.baudRate} baud.`);

      // Start reading stream
      this.startReadingLoop();
      return true;
    } catch (err: any) {
      this.setStatus('error');
      const msg = err.message || 'Failed to open serial port';
      this.addLog('error', `Connection error: ${msg}`);
      throw err;
    }
  }

  private async startReadingLoop() {
    try {
      while (this.port && this.port.readable && this.connectionState === 'connected') {
        const reader = this.port.readable.getReader();
        this.reader = reader;
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              const chunk = decoder.decode(value, { stream: true });
              this.handleIncomingChunk(chunk);
            }
          }
        } catch (readErr: any) {
          console.warn('[Serial Read Error]', readErr);
        } finally {
          reader.releaseLock();
          this.reader = null;
        }
      }
    } catch (err: any) {
      if (this.connectionState === 'connected') {
        this.addLog('error', `Serial stream terminated: ${err.message}`);
        this.disconnect();
      }
    }
  }

  private handleIncomingChunk(chunk: string) {
    this.lineBuffer += chunk;
    const lines = this.lineBuffer.split('\n');
    // keep incomplete tail in lineBuffer
    this.lineBuffer = lines.pop() || '';

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      this.addLog('rx', trimmed);

      // Attempt parsing JSON acknowledgement or status from ESP32
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.status) {
          this.lastAckReceived = parsed as SerialAckPayload;

          // Resolve pending command ACK promises
          while (this.pendingAckResolvers.length > 0) {
            const waiter = this.pendingAckResolvers.shift();
            if (waiter) {
              clearTimeout(waiter.timer);
              waiter.resolve(parsed as SerialAckPayload);
            }
          }
        }
      } catch {
        // Not JSON, just standard debug output from ESP32 Serial.println
      }
    }
  }

  /**
   * Transmits identification result to ESP32 via USB Serial.
   * Format: {"food":"Apple","condition":"GOOD","confidence":94}\n
   * Waits for ESP32 acknowledgement: {"status":"success","message":"..."}
   */
  async sendResult(payload: SerialCommandPayload, timeoutMs: number = 3500): Promise<SerialAckPayload> {
    if (this.connectionState !== 'connected' || !this.port) {
      throw new Error('ESP32 is not connected via USB Serial.');
    }

    // Clean payload
    const jsonStr = JSON.stringify({
      food: payload.food.trim(),
      condition: payload.condition,
      confidence: Math.round(payload.confidence),
    });

    const fullMessage = jsonStr + '\n';
    this.lastCommandSent = payload;
    this.addLog('tx', jsonStr);

    // Send data to ESP32 directly via writer
    const writer = this.port.writable.getWriter();
    try {
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(fullMessage));
    } finally {
      writer.releaseLock();
    }

    // Update internal simulated representation
    this.updateHardwareState(payload.condition, payload.food, payload.confidence);

    // Wait for ESP32 to respond with acknowledgement
    return new Promise<SerialAckPayload>((resolve, reject) => {
      const timer = setTimeout(() => {
        // Remove from pending list
        this.pendingAckResolvers = this.pendingAckResolvers.filter((w) => w.timer !== timer);
        const errMsg = `Hardware transmission timeout: ESP32 did not respond within ${timeoutMs}ms.`;
        this.addLog('error', errMsg);
        reject(new Error(errMsg));
      }, timeoutMs);

      this.pendingAckResolvers.push({ resolve, reject, timer });
    });
  }

  /**
   * For the built-in Hardware Digital Twin / Simulator
   * Allows mirroring hardware outputs in the UI or simulating response when demonstrating
   */
  simulateHardwareAction(payload: SerialCommandPayload) {
    this.updateHardwareState(payload.condition, payload.food, payload.confidence);
  }

  async disconnect(): Promise<void> {
    try {
      if (this.reader) {
        await this.reader.cancel().catch(() => {});
      }
      if (this.readableStreamClosed) {
        await this.readableStreamClosed.catch(() => {});
      }
      if (this.writableStreamClosed) {
        await this.writableStreamClosed.catch(() => {});
      }
      if (this.port) {
        await this.port.close().catch(() => {});
      }
    } catch (e) {
      console.warn('Error during disconnect:', e);
    } finally {
      this.port = null;
      this.reader = null;
      this.writer = null;
      this.setStatus('disconnected');
      this.addLog('info', 'Serial port closed.');
    }
  }
}

export const webSerial = new WebSerialService();

// Standalone helpers matching user integration format:
export async function connectESP32() {
  return await webSerial.connect();
}

export async function sendResultToESP32(food: string, condition: string, confidence: number | string) {
  const cond = condition.toUpperCase() as FoodCondition;
  const conf = Number(confidence) || 90;
  return await webSerial.sendResult({ food, condition: cond, confidence: conf });
}

export async function disconnectESP32() {
  return await webSerial.disconnect();
}

