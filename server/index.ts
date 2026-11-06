import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from './db.js';
import { analyzeFoodImage } from './vision.js';

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure upload directory exists
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage for uploaded images
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use('/uploads', express.static(uploadDir));

// System Health & Diagnostics
app.get('/api/health', (_req: Request, res: Response) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    vision_engine: 'Google Gemini Multimodal Vision API',
    has_api_key: hasGeminiKey,
    uptime_seconds: process.uptime(),
  });
});

// Image Analysis Endpoint (Supports base64 in body OR multipart file upload)
app.post(
  '/api/vision/analyze',
  upload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      let imageBuffer: Buffer | null = null;
      let mimeType = 'image/jpeg';
      let imageUrl: string | undefined = undefined;

      const clientApiKey = req.headers['x-gemini-key'] as string | undefined;

      if (req.file) {
        imageBuffer = fs.readFileSync(req.file.path);
        mimeType = req.file.mimetype;
        imageUrl = `/uploads/${req.file.filename}`;
      } else if (req.body.imageBase64) {
        let rawBase64 = req.body.imageBase64;
        const matches = rawBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          rawBase64 = matches[2];
        }
        imageBuffer = Buffer.from(rawBase64, 'base64');

        // Save snapshot to uploads for persistence
        const ext = mimeType.includes('png') ? '.png' : '.jpg';
        const snapshotName = `snapshot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`;
        const snapshotPath = path.join(uploadDir, snapshotName);
        fs.writeFileSync(snapshotPath, imageBuffer);
        imageUrl = `/uploads/${snapshotName}`;
      }

      if (!imageBuffer) {
        res.status(400).json({ error: 'No image provided. Please upload a file or pass base64 image data.' });
        return;
      }

      const method = (req.body.method as 'CAMERA' | 'IMAGE_UPLOAD' | 'MANUAL') || 'CAMERA';

      // Perform genuine computer vision analysis
      const analysis = await analyzeFoodImage(imageBuffer, mimeType, clientApiKey);

      // Record detection in database
      const historyItem = db.addHistoryRecord({
        user_id: 'user_default',
        food_name: analysis.food_name,
        category: analysis.category,
        condition: analysis.condition,
        confidence: analysis.confidence,
        observations: analysis.observations,
        detection_method: method,
        image_url: imageUrl,
        hardware_status: 'NOT_CONNECTED', // will update once client reports serial transmission
      });

      res.json({
        success: true,
        analysis,
        history_id: historyItem.id,
        image_url: imageUrl,
      });
    } catch (err: any) {
      console.error('[API Vision Error]', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Vision classification failed. Please check API key or retry.',
        suggest_manual: true,
      });
    }
  }
);

// --- Inventory Endpoints ---
app.get('/api/inventory', (_req: Request, res: Response) => {
  const items = db.getFoodItems();
  res.json({ success: true, count: items.length, items });
});

app.post('/api/inventory', (req: Request, res: Response) => {
  try {
    const { name, category, quantity, purchase_date, expiry_date, condition, storage_location, notes, image_url } =
      req.body;

    if (!name || !expiry_date) {
      res.status(400).json({ error: 'Name and Expiry Date are required.' });
      return;
    }

    const item = db.addFoodItem({
      user_id: 'user_default',
      name,
      category: category || 'Fruit',
      quantity: quantity || '1 unit',
      purchase_date: purchase_date || new Date().toISOString().split('T')[0],
      expiry_date,
      condition: condition || 'GOOD',
      storage_location: storage_location || 'Top Shelf',
      notes: notes || '',
      image_url: image_url || '',
    });

    res.status(201).json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory/:id', (req: Request, res: Response) => {
  const updated = db.updateFoodItem(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json({ success: true, item: updated });
});

app.delete('/api/inventory/:id', (req: Request, res: Response) => {
  const deleted = db.deleteFoodItem(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json({ success: true });
});

// --- Detection History Endpoints ---
app.get('/api/history', (_req: Request, res: Response) => {
  const history = db.getHistory();
  res.json({ success: true, history });
});

app.post('/api/history', (req: Request, res: Response) => {
  const record = db.addHistoryRecord({
    user_id: 'user_default',
    food_name: req.body.food_name || 'Manual Item',
    category: req.body.category || 'Other',
    condition: req.body.condition || 'GOOD',
    confidence: req.body.confidence || 100,
    observations: req.body.observations || 'Manual user assessment',
    detection_method: req.body.detection_method || 'MANUAL',
    image_url: req.body.image_url,
    hardware_status: req.body.hardware_status || 'NOT_CONNECTED',
  });
  res.status(201).json({ success: true, record });
});

app.patch('/api/history/:id/hardware-status', (req: Request, res: Response) => {
  const { status } = req.body;
  const historyList = db.getHistory();
  const item = historyList.find((h) => h.id === req.params.id);
  if (item) {
    item.hardware_status = status;
    res.json({ success: true, item });
  } else {
    res.status(404).json({ error: 'History record not found' });
  }
});

app.delete('/api/history/:id', (req: Request, res: Response) => {
  const deleted = db.deleteHistoryRecord(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'History item not found' });
    return;
  }
  res.json({ success: true });
});

app.delete('/api/history', (_req: Request, res: Response) => {
  db.clearHistory();
  res.json({ success: true, message: 'History cleared' });
});

app.listen(PORT, () => {
  console.log(`[Expiry First Server] Backend listening on http://localhost:${PORT}`);
});

