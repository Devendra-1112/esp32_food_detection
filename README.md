# Expiry First Refrigerator - AI Vision & ESP32 Hardware Integration

An intelligent food identification and freshness monitoring academic prototype. The system identifies fruits and vegetables from live laptop camera video, uploaded photos, or manual entries, assesses visual freshness (`GOOD`, `BAD`, `UNCERTAIN`), and transmits real-time telemetry to an **ESP32 microcontroller over a USB serial connection (Web Serial API)** to drive an external LCD display, status LEDs, and an audible warning buzzer.

---

## 🌟 Key Capabilities

1. **Live Camera Fruit & Vegetable Scanner**:
   - Laptop webcam stream with real-time target viewfinder reticle.
   - Single-frame high-resolution capture and camera device switcher.
   - Multimodal Computer Vision pipeline powered by Google Gemini Vision.
   - Categorizes produce (`Fruit`, `Vegetable`, etc.) and detects visible spoilage, mold, decay, and discoloration.
   - Auto-transmits or manual-transmits telemetry to ESP32 upon capture.

2. **Visual Condition Assessment (`GOOD`, `BAD`, `UNCERTAIN`)**:
   - **`GOOD`**: Normal visible color, firm skin, no mold/decay -> **Green LED ON**, Red LED OFF, Buzzer OFF, LCD displays `STATUS: GOOD`.
   - **`BAD`**: Evident fungal spores, dark rot, softening, deterioration -> Green LED OFF, **Red LED ON**, **Warning Buzzer Beeps**, LCD displays `STATUS: BAD`.
   - **`UNCERTAIN`**: Blurry, occluded, or ambiguous visual evidence -> Green LED OFF, Red LED OFF, Buzzer OFF, prompts manual inspection.

3. **ESP32 USB Serial Communication (Web Serial API)**:
   - Direct browser-to-microcontroller USB serial link at 115200 baud.
   - Standard JSON protocol: `{"food":"Apple","condition":"GOOD","confidence":94}\n`
   - ESP32 acknowledgement: `{"status":"success","message":"Hardware updated"}\n`
   - Real-time bidirectional serial traffic monitor (TX / RX / INFO / ERROR).
   - Quick hardware test buttons for demonstration.

4. **Hardware Digital Twin & Breadboard Simulator**:
   - Interactive on-screen graphical simulator replicating the exact ESP32 circuit:
     - 16x2 Green Backlight LCD with dot-matrix font.
     - Glowing Green and Red 5mm LEDs.
     - Synthesized piezoelectric warning buzzer using the browser's Web Audio API.
   - Enables full end-to-end testing and presentation even when a physical ESP32 is not plugged into USB!

5. **Image Upload Mode**:
   - Drag-and-drop support for JPG, JPEG, PNG, and WEBP.
   - Inspection preview with user confirmation and correction step before hardware transmission.

6. **Manual Food Entry**:
   - Full manual entry form when camera access is unavailable.
   - Supports manually selected GOOD, BAD, and UNCERTAIN conditions and transmits to ESP32.

7. **Expiry First Inventory Management**:
   - Items sorted strictly by nearest expiration date first to minimize waste.
   - Visual countdown badges: Expired (Red alert), Expiring Soon <= 3 days (Amber alert), Fresh (Green).
   - Compartment tracking: Crisper Drawer, Top Shelf, Middle Shelf, Door Rack, Freezer, Pantry.

8. **Detection History Log**:
   - Complete audit trail of all scans, confidence scores, visual observations, and hardware statuses.
   - Search by food name, filter by condition, and re-transmit past detections to ESP32 with one click.

---

## 🛠️ Hardware Setup & Pin Assignments

```
       +-----------------------------------------+
       |             ESP32 DevKit                |
       |                                         |
       |  GPIO 18 -----------------> [220Ω] ---> (+) GREEN LED (-) ---> GND
       |  GPIO 19 -----------------> [220Ω] ---> (+) RED LED   (-) ---> GND
       |  GPIO 23 -----------------> (+) BUZZER (-) ------------------> GND
       |                                         |
       |  GPIO 21 (SDA) -----------> SDA (LCD 16x2 / OLED)
       |  GPIO 22 (SCL) -----------> SCL (LCD 16x2 / OLED)
       |  5V / 3.3V ---------------> VCC (LCD / OLED)
       |  GND ---------------------> GND (LCD / OLED)
       |                                         |
       |  USB Port ----------------> Laptop USB Port
       +-----------------------------------------+
```

### ESP32 Pin Summary:
| Component | GPIO Pin | Details |
|---|---|---|
| **Green LED** | `GPIO 18` | In series with 220Ω resistor to Ground |
| **Red LED** | `GPIO 19` | In series with 220Ω resistor to Ground |
| **Active Buzzer** | `GPIO 23` | Emits 3 sharp beeps on BAD condition |
| **I2C LCD SDA** | `GPIO 21` | Standard ESP32 I2C Data line |
| **I2C LCD SCL** | `GPIO 22` | Standard ESP32 I2C Clock line |
| **Baud Rate** | `115200` | USB Serial baud rate |

---

## ⚡ Firmware Flashing (Arduino IDE)

1. Open **Arduino IDE**.
2. Install the **ESP32** board support package via Boards Manager (`esp32` by Espressif).
3. Install required libraries from Library Manager:
   - `ArduinoJson` (v6 or v7)
   - `LiquidCrystal I2C`
4. Open the firmware sketch located at:
   `d:\esp23\firmware\esp32_expiry_refrigerator\esp32_expiry_refrigerator.ino`
5. Connect your ESP32 to the laptop using a USB data cable.
6. Select your board (e.g. `ESP32 Dev Module`) and the active COM port.
7. Click **Upload**.

---

## 🚀 Running the Web Application

### Prerequisites:
- Node.js v18+ (Node.js v22 installed)
- Google Chrome, Microsoft Edge, or Opera (required for Web Serial API support)

### Start Development Server:
```bash
# Starts both Express backend (Port 3001) and Vite frontend (Port 5173) concurrently:
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API Gateway**: `http://localhost:3001`

---

## 📋 Serial Communication Protocol

### From Laptop to ESP32:
Single JSON line ending in `\n`:
```json
{"food":"Apple","condition":"GOOD","confidence":94}
```

### From ESP32 to Laptop:
Single JSON acknowledgement line ending in `\n`:
```json
{"status":"success","message":"Hardware updated","food":"Apple","condition":"GOOD","confidence":94}
```

---

## 🛡️ Food Safety Disclaimer
This system evaluates external visible characteristics only. It cannot detect microscopic foodborne pathogens, bacterial toxins, or internal core spoilage. A `GOOD` classification must never be treated as a food safety certification.
