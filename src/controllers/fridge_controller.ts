import { Request, Response } from 'express';
import * as FridgeService from '../services/fridge_service';

export async function getFridge(req: Request, res: Response) {
  const userId = (req as any).userId;
  const fridge = await FridgeService.getFridge(userId);
  res.send(fridge);
}

export async function addOrUpdateItem(req: Request, res: Response) {
  const userId = (req as any).userId;
  const item = req.body;
  const updated = await FridgeService.addOrUpdateItem(userId, item);
  res.send(updated);
}

export async function clearFridge(req: Request, res: Response) {
  const userId = (req as any).userId;
  const updated = await FridgeService.clearFridge(userId);
  res.send(updated);
}


export async function aiIdentifyFridgeItemsFiles(req: Request, res: Response) {
    const userId = (req as any).userId;
    const files = req.files as Express.Multer.File[];
  
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).send({ error: "No files uploaded (expected field 'images')" });
      return;
    }
  
    try {
      // convert to base64
      const images = files.map(file => ({
        mime: file.mimetype,
        content: file.buffer.toString('base64')
      }));
  
      const fridge = await FridgeService.identifyFridgeItemsFromImages(userId, images);
      res.status(200).send(fridge);
    } catch (err: any) {
      console.error("AI fridge error:", err);
      res.status(500).send({ error: "Failed to identify fridge items" });
    }
  }
