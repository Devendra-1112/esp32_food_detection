/*
 ==============================================================================
  PROJECT: Expiry First Refrigerator - IoT Hardware Firmware
  PLATFORM: ESP32 (DevKit V1 / WROOM-32)
  COMMUNICATION: USB Serial (Baud: 115200) with Web Serial API
  DISPLAY: I2C LCD 16x2 (or optional SSD1306 OLED)
  INDICATORS: Green LED (Good), Red LED (Bad), Warning Buzzer
 ==============================================================================
*/

#include <Arduino.h>
#include <Wire.h>
#include <ArduinoJson.h>

// ================= USER CONFIGURATION & PIN ASSIGNMENTS =================
// Configured to match your hardware connections:
#define GREEN_LED_PIN   13    // GPIO 13 for Green LED (via 220-330 ohm resistor)
#define RED_LED_PIN     14    // GPIO 14 for Red LED (via 220-330 ohm resistor)
#define BUZZER_PIN      27    // GPIO 27 for Active Buzzer

// I2C Pins on standard ESP32:
#define LCD_SDA         21    // GPIO 21 for I2C Data
#define LCD_SCL         22    // GPIO 22 for I2C Clock

// Select Display Type: 1 for I2C LCD 16x2, 2 for SSD1306 OLED (128x64)
#define DISPLAY_TYPE 1 

#if DISPLAY_TYPE == 1
  #include <LiquidCrystal_I2C.h>
  // Common I2C addresses are 0x27 or 0x3F. Change if needed.
  LiquidCrystal_I2C lcd(0x27, 16, 2);
  bool lcdAvailable = false;
#elif DISPLAY_TYPE == 2
  #include <Adafruit_GFX.h>
  #include <Adafruit_SSD1306.h>
  #define SCREEN_WIDTH 128
  #define SCREEN_HEIGHT 64
  #define OLED_RESET -1
  Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
  bool oledAvailable = false;
#endif

// ================= SYSTEM VARIABLES =================
String inputString = "";
bool stringComplete = false;

// ================= FORWARD DECLARATIONS =================
void initDisplay();
void updateDisplay(const String& line1, const String& line2);
void applyHardwareOutputs(const String& condition, const String& food, int confidence);
void triggerBuzzerAlert();

void setup() {
  // Initialize USB Serial Communication
  Serial.begin(115200);
  delay(500);

  // Configure GPIO directions
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Safe defaults: Keep LEDs and Buzzer OFF at boot to avoid false triggers
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize Display
  initDisplay();
  updateDisplay("EXPIRY FIRST", "READY TO SCAN");

  Serial.println("{\"status\":\"boot\",\"message\":\"ESP32 Refrigerator Node Online (115200 baud)\"}");
}

void loop() {
  // Read serial data line by line
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    if (inChar == '\n') {
      stringComplete = true;
    } else if (inChar != '\r') {
      inputString += inChar;
    }
  }

  // Process completed command line
  if (stringComplete) {
    inputString.trim();
    if (inputString.length() > 0) {
      processCommand(inputString);
    }
    inputString = "";
    stringComplete = false;
  }
}

/**
 * Parses and executes incoming JSON payload from laptop.
 * Expected format:
 * {"food":"Apple","condition":"GOOD","confidence":94}
 * {"food":"Tomato","condition":"BAD","confidence":91}
 * {"food":"Banana","condition":"UNCERTAIN","confidence":45}
 */
void processCommand(const String& jsonStr) {
  // Allocate JSON document buffer (Compatible with ArduinoJson v6 and v7)
  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<384> doc;
  #endif

  DeserializationError error = deserializeJson(doc, jsonStr);

  if (error) {
    // Return error ACK
    Serial.print("{\"status\":\"error\",\"message\":\"JSON parse failed: ");
    Serial.print(error.c_str());
    Serial.println("\"}");
    return;
  }

  // Validate required keys
  if (!doc.containsKey("food") || !doc.containsKey("condition")) {
    Serial.println("{\"status\":\"error\",\"message\":\"Missing required fields: food or condition\"}");
    return;
  }

  String food = doc["food"].as<String>();
  String condition = doc["condition"].as<String>();
  int confidence = doc.containsKey("confidence") ? doc["confidence"].as<int>() : 0;

  condition.toUpperCase();

  // Apply LED, Buzzer, and LCD hardware outputs
  applyHardwareOutputs(condition, food, confidence);

  // Send successful JSON acknowledgement back to laptop Web Serial API
  Serial.print("{\"status\":\"success\",\"message\":\"Hardware updated\",\"food\":\"");
  Serial.print(food);
  Serial.print("\",\"condition\":\"");
  Serial.print(condition);
  Serial.print("\",\"confidence\":");
  Serial.print(confidence);
  Serial.println("}");
}

/**
 * Controls LEDs, Buzzer, and Display according to project safety rules:
 * - GOOD: Green LED ON, Red LED OFF, Buzzer OFF.
 * - BAD: Green LED OFF, Red LED ON, Buzzer Warning Beeps.
 * - UNCERTAIN: Both LEDs OFF, Buzzer OFF.
 */
void applyHardwareOutputs(const String& condition, const String& food, int confidence) {
  // Line 1: Food Name (e.g. Apple)
  String line1 = food.substring(0, 16);

  // Line 2: Freshness condition and confidence percentage (e.g. GOOD 94%)
  String line2 = condition;
  if (confidence > 0) {
    line2 += " " + String(confidence) + "%";
  }
  line2 = line2.substring(0, 16);

  if (condition == "GOOD") {
    digitalWrite(GREEN_LED_PIN, HIGH);
    digitalWrite(RED_LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);

    updateDisplay(line1, line2);
  } 
  else if (condition == "BAD") {
    digitalWrite(GREEN_LED_PIN, LOW);
    digitalWrite(RED_LED_PIN, HIGH);

    updateDisplay(line1, line2);

    // Audible alarm for spoiled item
    triggerBuzzerAlert();
  } 
  else { // UNCERTAIN or unknown
    digitalWrite(GREEN_LED_PIN, LOW);
    digitalWrite(RED_LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);

    updateDisplay(line1, line2);
  }
}

/**
 * Three distinct warning beeps for BAD food condition
 */
void triggerBuzzerAlert() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(120);
    digitalWrite(BUZZER_PIN, LOW);
    delay(80);
  }
}

/**
 * Initializes the I2C display with autodetection
 */
void initDisplay() {
  Wire.begin(LCD_SDA, LCD_SCL); // ESP32 SDA (GPIO 21), SCL (GPIO 22) pins

#if DISPLAY_TYPE == 1
  // Test I2C LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcdAvailable = true;
#elif DISPLAY_TYPE == 2
  // Test SSD1306 OLED
  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);
    oledAvailable = true;
  }
#endif
}

/**
 * Updates LCD or OLED with two-line information
 */
void updateDisplay(const String& line1, const String& line2) {
#if DISPLAY_TYPE == 1
  if (lcdAvailable) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(line1);
    lcd.setCursor(0, 1);
    lcd.print(line2);
  }
#elif DISPLAY_TYPE == 2
  if (oledAvailable) {
    display.clearDisplay();
    display.setTextSize(2);
    display.setCursor(0, 4);
    display.println(line1);
    display.setTextSize(1);
    display.setCursor(0, 36);
    display.println(line2);
    display.display();
  }
#endif
}

