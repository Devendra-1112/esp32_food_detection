import { DetectionRecord, InventoryItem, VisionResult } from '../types';

export const API_BASE = '/api';

export async function checkBackendHealth(): Promise<{
  status: string;
  has_api_key: boolean;
  vision_engine: string;
}> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function analyzeFoodImageApi(
  payload: { imageBase64?: string; file?: File; method: 'CAMERA' | 'IMAGE_UPLOAD' | 'MANUAL' },
  customApiKey?: string
): Promise<{
  success: boolean;
  analysis: VisionResult;
  history_id: string;
  image_url?: string;
}> {
  const headers: Record<string, string> = {};
  if (customApiKey) {
    headers['x-gemini-key'] = customApiKey;
  }

  if (payload.file) {
    const formData = new FormData();
    formData.append('image', payload.file);
    formData.append('method', payload.method);

    const res = await fetch(`${API_BASE}/vision/analyze`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Computer Vision analysis failed');
    }
    return data;
  } else if (payload.imageBase64) {
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE}/vision/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64: payload.imageBase64,
        method: payload.method,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Computer Vision analysis failed');
    }
    return data;
  } else {
    throw new Error('No image payload supplied');
  }
}

export async function getInventoryApi(): Promise<InventoryItem[]> {
  const res = await fetch(`${API_BASE}/inventory`);
  const data = await res.json();
  return data.items || [];
}

export async function addInventoryItemApi(
  item: Omit<InventoryItem, 'id' | 'created_at'>
): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save inventory item');
  return data.item;
}

export async function updateInventoryItemApi(
  id: string,
  updates: Partial<InventoryItem>
): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update item');
  return data.item;
}

export async function deleteInventoryItemApi(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/inventory/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

export async function getHistoryApi(): Promise<DetectionRecord[]> {
  const res = await fetch(`${API_BASE}/history`);
  const data = await res.json();
  return data.history || [];
}

export async function addManualHistoryApi(
  record: Omit<DetectionRecord, 'id' | 'detected_at'>
): Promise<DetectionRecord> {
  const res = await fetch(`${API_BASE}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to record history');
  return data.record;
}

export async function updateHistoryHardwareStatusApi(
  id: string,
  status: DetectionRecord['hardware_status']
): Promise<void> {
  await fetch(`${API_BASE}/history/${id}/hardware-status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function deleteHistoryItemApi(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

export async function clearHistoryApi(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/history`, { method: 'DELETE' });
  const data = await res.json();
  return data.success;
}

