import { Request, Response, NextFunction } from 'express';
import { CreateNotesAppUseCase } from '../../application/use-cases/CreateNotesAppUseCase';
import { GetNotesAppByIdUseCase } from '../../application/use-cases/GetNotesAppByIdUseCase';
import { GetAllNotesAppsUseCase } from '../../application/use-cases/GetAllNotesAppsUseCase';
import { UpdateNotesAppUseCase } from '../../application/use-cases/UpdateNotesAppUseCase';
import { DeleteNotesAppUseCase } from '../../application/use-cases/DeleteNotesAppUseCase';
import { INotesAppProps } from '../../domain/entities/NotesApp';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';
import { validateRequest } from '../../shared/validation/RequestValidator';

export class NotesAppController {
  constructor(
    private createNotesAppUseCase: CreateNotesAppUseCase,
    private getNotesAppByIdUseCase: GetNotesAppByIdUseCase,
    private getAllNotesAppsUseCase: GetAllNotesAppsUseCase,
    private updateNotesAppUseCase: UpdateNotesAppUseCase,
    private deleteNotesAppUseCase: DeleteNotesAppUseCase,
    private logger: Logger
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info('Creating NotesApp', { body: req.body });

      // Validate request
      const validationResult = await validateRequest(req.body, this.getCreateNotesAppSchema());
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.errors
        });
        return;
      }

      const notesapp = await this.createNotesAppUseCase.execute(req.body);

      res.status(201).json({
        success: true,
        data: notesapp,
        message: 'NotesApp created successfully'
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info('Getting NotesApp by id', { id });

      const notesapp = await this.getNotesAppByIdUseCase.execute(id);

      res.status(200).json({
        success: true,
        data: notesapp
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query;
      this.logger.info('Getting all NotesApps', { filters });

      const notesapps = await this.getAllNotesAppsUseCase.execute(filters);

      res.status(200).json({
        success: true,
        data: notesapps,
        count: notesapps.length
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info('Updating NotesApp', { id, body: req.body });

      // Validate request
      const validationResult = await validateRequest(req.body, this.getUpdateNotesAppSchema());
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.errors
        });
        return;
      }

      const notesapp = await this.updateNotesAppUseCase.execute(id, req.body);

      res.status(200).json({
        success: true,
        data: notesapp,
        message: 'NotesApp updated successfully'
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info('Deleting NotesApp', { id });

      await this.deleteNotesAppUseCase.execute(id);

      res.status(200).json({
        success: true,
        message: 'NotesApp deleted successfully'
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

  private getCreateNotesAppSchema(): any {
    // TODO: Implement validation schema
    return {};
  }

  private getUpdateNotesAppSchema(): any {
    // TODO: Implement validation schema
    return {};
  }
}