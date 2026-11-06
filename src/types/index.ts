export type FoodCondition = 'GOOD' | 'BAD' | 'UNCERTAIN';

export type FoodCategory = 'Fruit' | 'Vegetable' | 'Dairy' | 'Bakery' | 'Meat' | 'Other';

export interface VisionResult {
  food_name: string;
  category: FoodCategory;
  condition: FoodCondition;
  confidence: number;
  observations: string;
  recommended_shelf_life_days?: number;
  model_used?: string;
  timestamp: string;
}

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  category: FoodCategory;
  quantity: string;
  purchase_date: string;
  expiry_date: string;
  condition: FoodCondition;
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
  condition: FoodCondition;
  confidence: number;
  observations: string;
  detection_method: 'CAMERA' | 'IMAGE_UPLOAD' | 'MANUAL';
  image_url?: string;
  hardware_status: 'SENT_AND_ACK' | 'SENT_NO_ACK' | 'NOT_CONNECTED' | 'FAILED';
  detected_at: string;
}

export interface SerialCommandPayload {
  food: string;
  condition: FoodCondition;
  confidence: number;
}

export interface SerialAckPayload {
  status: 'success' | 'error';
  message: string;
  food?: string;
  condition?: string;
}

export interface SerialLogEntry {
  id: string;
  timestamp: string;
  type: 'tx' | 'rx' | 'info' | 'error';
  message: string;
}

export type HardwareConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

