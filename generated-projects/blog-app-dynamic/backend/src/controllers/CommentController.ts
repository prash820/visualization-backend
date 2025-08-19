import { Request, Response } from 'express';
import { CommentService } from '../services/CommentService';

export class CommentController {
  constructor(private commentService: CommentService) {}

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const items = await this.commentService.findAll();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await this.commentService.findById(id);
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const item = await this.commentService.create(req.body);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create item' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await this.commentService.update(id, req.body);
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update item' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.commentService.delete(id);
      if (!success) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete item' });
    }
  }
}

export default CommentController;