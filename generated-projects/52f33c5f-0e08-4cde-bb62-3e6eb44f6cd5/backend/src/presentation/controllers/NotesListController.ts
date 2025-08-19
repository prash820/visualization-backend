import { Request, Response, NextFunction } from 'express';
import { CreateNotesListUseCase } from '../../application/use-cases/CreateNotesListUseCase';
import { GetNotesListByIdUseCase } from '../../application/use-cases/GetNotesListByIdUseCase';
import { GetAllNotesListsUseCase } from '../../application/use-cases/GetAllNotesListsUseCase';
import { UpdateNotesListUseCase } from '../../application/use-cases/UpdateNotesListUseCase';
import { DeleteNotesListUseCase } from '../../application/use-cases/DeleteNotesListUseCase';
import { INotesListProps } from '../../domain/entities/NotesList';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';
import { validateRequest } from '../../shared/validation/RequestValidator';

export class NotesListController {
  constructor(
    private createNotesListUseCase: CreateNotesListUseCase,
    private getNotesListByIdUseCase: GetNotesListByIdUseCase,
    private getAllNotesListsUseCase: GetAllNotesListsUseCase,
    private updateNotesListUseCase: UpdateNotesListUseCase,
    private deleteNotesListUseCase: DeleteNotesListUseCase,
    private logger: Logger
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info('Creating NotesList', { body: req.body });

      // Validate request
      const validationResult = await validateRequest(req.body, this.getCreateNotesListSchema());
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.errors
        });
        return;
      }

      const noteslist = await this.createNotesListUseCase.execute(req.body);

      res.status(201).json({
        success: true,
        data: noteslist,
        message: 'NotesList created successfully'
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info('Getting NotesList by id', { id });

      const noteslist = await this.getNotesListByIdUseCase.execute(id);

      res.status(200).json({
        success: true,
        data: noteslist
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query;
      this.logger.info('Getting all NotesLists', { filters });

      const noteslists = await this.getAllNotesListsUseCase.execute(filters);

      res.status(200).json({
        success: true,
        data: noteslists,
        count: noteslists.length
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info('Updating NotesList', { id, body: req.body });

      // Validate request
      const validationResult = await validateRequest(req.body, this.getUpdateNotesListSchema());
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.errors
        });
        return;
      }

      const noteslist = await this.updateNotesListUseCase.execute(id, req.body);

      res.status(200).json({
        success: true,
        data: noteslist,
        message: 'NotesList updated successfully'
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info('Deleting NotesList', { id });

      await this.deleteNotesListUseCase.execute(id);

      res.status(200).json({
        success: true,
        message: 'NotesList deleted successfully'
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

  private getCreateNotesListSchema(): any {
    // TODO: Implement validation schema
    return {};
  }

  private getUpdateNotesListSchema(): any {
    // TODO: Implement validation schema
    return {};
  }
}