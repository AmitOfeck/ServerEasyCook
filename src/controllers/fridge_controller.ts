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
    const stepaiIdentifyFridgeItemsStart = performance.now();
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
      const stepaiIdentifyFridgeItemsEnd = performance.now();
      console.log(`Ai Identify Fridge Items: ${(stepaiIdentifyFridgeItemsEnd - stepaiIdentifyFridgeItemsStart).toFixed(2)}ms`);
      res.status(200).send(fridge);
    } catch (err: any) {
      console.error("AI fridge error:", err);
      res.status(500).send({ error: "Failed to identify fridge items" });
    }
  }

  export async function addItem(req: Request, res: Response) {
    const userId = (req as any).userId;
    const item = req.body;
    try {
      const fridge = await FridgeService.addItem(userId, item);
      if (!fridge) {
        res.status(404).send({ message: "Fridge not found" });
        return;
      }
      res.status(201).send({ items: fridge.items });
    } catch (e) {
      res.status(500).send({ message: "Server error" });
    }
  }
  
  export async function updateItem(req: Request, res: Response) {
    const userId = (req as any).userId;
    const { originalName, originalUnit, item } = req.body;
    try {
      const fridge = await FridgeService.updateItem(userId, originalName, originalUnit, item);
      if (!fridge) {
        res.status(404).send({ message: "Fridge not found" });
        return;
      }
      res.status(200).send({ items: fridge.items });
    } catch (e: any) {
      if (e?.message === "Item not found") {
        res.status(404).send({ message: "Item not found" });
        return;
      }
      res.status(500).send({ message: "Server error" });
    }
  }
  
  export async function deleteItem(req: Request, res: Response) {
    const userId = (req as any).userId;
    const { name, unit } = req.body;
    try {
      const fridge = await FridgeService.deleteItem(userId, name, unit);
      if (!fridge) {
        res.status(404).send({ message: "Item not found" });
        return;
      }
      res.status(200).send({ items: fridge.items });
    } catch (e) {
      res.status(500).send({ message: "Server error" });
    }
  }
  

