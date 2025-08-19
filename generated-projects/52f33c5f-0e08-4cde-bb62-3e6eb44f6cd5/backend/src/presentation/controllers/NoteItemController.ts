import { Request, Response, NextFunction } from 'express';
import { CreateNoteItemUseCase } from '../../application/use-cases/CreateNoteItemUseCase';
import { GetNoteItemByIdUseCase } from '../../application/use-cases/GetNoteItemByIdUseCase';
import { GetAllNoteItemsUseCase } from '../../application/use-cases/GetAllNoteItemsUseCase';
import { UpdateNoteItemUseCase } from '../../application/use-cases/UpdateNoteItemUseCase';
import { DeleteNoteItemUseCase } from '../../application/use-cases/DeleteNoteItemUseCase';
import { INoteItemProps } from '../../domain/entities/NoteItem';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';
import { validateRequest } from '../../shared/validation/RequestValidator';

export class NoteItemController {
  constructor(
    private createNoteItemUseCase: CreateNoteItemUseCase,
    private getNoteItemByIdUseCase: GetNoteItemByIdUseCase,
    private getAllNoteItemsUseCase: GetAllNoteItemsUseCase,
    private updateNoteItemUseCase: UpdateNoteItemUseCase,
    private deleteNoteItemUseCase: DeleteNoteItemUseCase,
    private logger: Logger
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info('Creating NoteItem', { body: req.body });

      // Validate request
      const validationResult = await validateRequest(req.body, this.getCreateNoteItemSchema());
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.errors
        });
        return;
      }

      const noteitem = await this.createNoteItemUseCase.execute(req.body);

      res.status(201).json({
        success: true,
        data: noteitem,
        message: 'NoteItem created successfully'
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info('Getting NoteItem by id', { id });

      const noteitem = await this.getNoteItemByIdUseCase.execute(id);

      res.status(200).json({
        success: true,
        data: noteitem
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query;
      this.logger.info('Getting all NoteItems', { filters });

      const noteitems = await this.getAllNoteItemsUseCase.execute(filters);

      res.status(200).json({
        success: true,
        data: noteitems,
        count: noteitems.length
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info('Updating NoteItem', { id, body: req.body });

      // Validate request
      const validationResult = await validateRequest(req.body, this.getUpdateNoteItemSchema());
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.errors
        });
        return;
      }

      const noteitem = await this.updateNoteItemUseCase.execute(id, req.body);

      res.status(200).json({
        success: true,
        data: noteitem,
        message: 'NoteItem updated successfully'
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info('Deleting NoteItem', { id });

      await this.deleteNoteItemUseCase.execute(id);

      res.status(200).json({
        success: true,
        message: 'NoteItem deleted successfully'
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  private handleError(error: any, res: Response, next: NextFunction): void {
    this.logger.error('Controller error', { error });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.message
      });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: 'Not found',
        details: error.message
      });
    } else {
      next(error);
    }
  }

  private getCreateNoteItemSchema(): any {
    // TODO: Implement validation schema
    return {};
  }

  private getUpdateNoteItemSchema(): any {
    // TODO: Implement validation schema
    return {};
  }
}