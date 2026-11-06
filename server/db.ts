import fs from 'fs';
import path from 'path';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
}

export interface FoodItem {
  id: string;
  user_id: string;
  name: string;
  category: 'Fruit' | 'Vegetable' | 'Dairy' | 'Bakery' | 'Meat' | 'Other';
  quantity: string;
  purchase_date: string;
  expiry_date: string;
  condition: 'GOOD' | 'BAD' | 'UNCERTAIN';
  storage_location: string;
  notes?: string;
  image_url?: string;
  created_at: string;
}

export interface DetectionRecord {
  id: string;
  user_id: string;
  food_name: string;
  category: string;
  condition: 'GOOD' | 'BAD' | 'UNCERTAIN';
  confidence: number;
  observations: string;
  detection_method: 'CAMERA' | 'IMAGE_UPLOAD' | 'MANUAL';
  image_url?: string;
  hardware_status: 'SENT_AND_ACK' | 'SENT_NO_ACK' | 'NOT_CONNECTED' | 'FAILED';
  detected_at: string;
}

interface DatabaseSchema {
  profiles: Profile[];
  food_items: FoodItem[];
  detection_history: DetectionRecord[];
}

const DB_FILE = path.resolve(process.cwd(), 'database.json');

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[DB] Failed to parse database file, initializing empty schema:', err);
    }

    const defaultData: DatabaseSchema = {
      profiles: [
        {
          id: 'user_default',
          full_name: 'Smart Kitchen User',
          email: 'kitchen@expiryfirst.local',
        },
      ],
      food_items: [
        {
          id: 'item_1',
          user_id: 'user_default',
          name: 'Fresh Fuji Apple',
          category: 'Fruit',
          quantity: '4 units',
          purchase_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
          expiry_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          condition: 'GOOD',
          storage_location: 'Crisper Drawer',
          notes: 'Firm skin, bright red color',
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: 'item_2',
          user_id: 'user_default',
          name: 'Roma Tomato',
          category: 'Vegetable',
          quantity: '3 units',
          purchase_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
          expiry_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
          condition: 'GOOD',
          storage_location: 'Middle Shelf',
          notes: 'Ripe, best consumed soon',
          created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      ],
      detection_history: [
        {
          id: 'det_1',
          user_id: 'user_default',
          food_name: 'Apple',
          category: 'Fruit',
          condition: 'GOOD',
          confidence: 96,
          observations: 'Firm surface, vibrant pigmentation, no signs of bruising or fungal spores.',
          detection_method: 'CAMERA',
          hardware_status: 'SENT_AND_ACK',
          detected_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    };

    this.save(defaultData);
    return defaultData;
  }

  private save(data: DatabaseSchema): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to save database file:', err);
    }
  }

  // --- Food Items ---
  getFoodItems(): FoodItem[] {
    return [...this.data.food_items].sort(
      (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
    );
  }

  addFoodItem(item: Omit<FoodItem, 'id' | 'created_at'>): FoodItem {
    const newItem: FoodItem = {
      ...item,
      id: 'food_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      created_at: new Date().toISOString(),
    };
    this.data.food_items.push(newItem);
    this.save(this.data);
    return newItem;
  }

  updateFoodItem(id: string, updates: Partial<FoodItem>): FoodItem | null {
    const idx = this.data.food_items.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    this.data.food_items[idx] = { ...this.data.food_items[idx], ...updates };
    this.save(this.data);
    return this.data.food_items[idx];
  }

  deleteFoodItem(id: string): boolean {
    const initialLen = this.data.food_items.length;
    this.data.food_items = this.data.food_items.filter((x) => x.id !== id);
    if (this.data.food_items.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  // --- Detection History ---
  getHistory(): DetectionRecord[] {
    return [...this.data.detection_history].sort(
      (a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
    );
  }

  addHistoryRecord(record: Omit<DetectionRecord, 'id' | 'detected_at'>): DetectionRecord {
    const newRecord: DetectionRecord = {
      ...record,
      id: 'det_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      detected_at: new Date().toISOString(),
    };
    this.data.detection_history.unshift(newRecord);
    this.save(this.data);
    return newRecord;
  }

  deleteHistoryRecord(id: string): boolean {
    const initialLen = this.data.detection_history.length;
    this.data.detection_history = this.data.detection_history.filter((x) => x.id !== id);
    if (this.data.detection_history.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  clearHistory(): void {
    this.data.detection_history = [];
    this.save(this.data);
  }
}

export const db = new Database();

