# ESP32 Hardware Wiring & Flashing Guide

## 1. Hardware Bill of Materials
1. **ESP32 Development Board** (ESP32-WROOM-32 / ESP32 DevKit V1)
2. **I2C LCD 16x2 Display** (with PCF8574 backpack) OR **0.96" SSD1306 I2C OLED**
3. **Green LED** (5mm)
4. **Red LED** (5mm)
5. **2x 220Ω - 330Ω Resistors** (for LEDs)
6. **Active 5V/3.3V Buzzer** (or NPN transistor-driven piezo buzzer)
7. **Breadboard & Jumper Wires**
8. **Micro-USB / USB-C Data Cable** (must support data lines, not charge-only)

---

## 2. Pin Connection Diagram

```
       +-----------------------------------------+
       |             ESP32 DevKit                |
       |                                         |
       |  GPIO 18 -----------------> [220Ω] ---> (+) GREEN LED (-) ---> GND
       |  GPIO 19 -----------------> [220Ω] ---> (+) RED LED   (-) ---> GND
       |  GPIO 23 -----------------> (+) BUZZER (-) ------------------> GND
       |                                         |
       |  GPIO 21 (SDA) -----------> SDA (LCD / OLED)
       |  GPIO 22 (SCL) -----------> SCL (LCD / OLED)
       |  3.3V or 5V --------------> VCC (LCD / OLED)
       |  GND ---------------------> GND (LCD / OLED)
       |                                         |
       |  USB Port ----------------> Laptop USB Port
       +-----------------------------------------+
```

### Pin Table Summary:
| Component | ESP32 GPIO | Description |
|-----------|------------|-------------|
| **Green LED Anode (+)** | `GPIO 18` | In series with 220Ω resistor to ground |
| **Red LED Anode (+)** | `GPIO 19` | In series with 220Ω resistor to ground |
| **Buzzer Positive (+)** | `GPIO 23` | Active buzzer positive lead |
| **Display SDA** | `GPIO 21` | I2C Data line |
| **Display SCL** | `GPIO 22` | I2C Clock line |
| **Display VCC** | `5V` (or `3.3V` for OLED) | Display Power |
| **Common Ground (GND)** | `GND` | Shared ground for LEDs, buzzer & display |

---

## 3. Arduino IDE Setup Instructions

1. Open **Arduino IDE** (v2.x recommended).
2. Go to **File -> Preferences**.
3. Under **Additional Boards Manager URLs**, enter:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
4. Go to **Tools -> Board -> Boards Manager**, search for `esp32` by Espressif Systems, and click **Install**.
5. Install the following libraries via **Sketch -> Include Library -> Manage Libraries**:
   - `ArduinoJson` (by Benoit Blanchon, v6 or v7)
   - `LiquidCrystal I2C` (by Frank de Brabander or Marco Schwartz)
   - *(Optional if using OLED)*: `Adafruit SSD1306` & `Adafruit GFX Library`
6. Select your board under **Tools -> Board -> ESP32 Arduino -> ESP32 Dev Module**.
7. Connect your ESP32 to your laptop via USB, select the corresponding COM port under **Tools -> Port**.
8. Open `firmware/esp32_expiry_refrigerator/esp32_expiry_refrigerator.ino` and click **Upload**.

---

## 4. Testing Communication in Arduino Serial Monitor
- Set Serial Monitor baud rate to **115200 baud** and line ending to **Both NL & CR**.
- Type:
  ```json
  {"food":"Apple","condition":"GOOD","confidence":95}
  ```
  Expected Response:
  ```json
  {"status":"success","message":"Hardware updated","food":"Apple","condition":"GOOD","confidence":95}
  ```
  - **Green LED** lights ON.
  - **Red LED** stays OFF.
  - **LCD** displays:
    ```
    APPLE
    STATUS: GOOD
    ```

- Type:
  ```json
  {"food":"Tomato","condition":"BAD","confidence":91}
  ```
  - **Green LED** turns OFF.
  - **Red LED** lights ON.
  - **Buzzer** emits 3 sharp alert pulses.
  - **LCD** displays:
    ```
    TOMATO
    STATUS: BAD
    ```

