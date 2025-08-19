import { Request, Response, NextFunction } from 'express';
import { CreateNoteFormUseCase } from '../../application/use-cases/CreateNoteFormUseCase';
import { GetNoteFormByIdUseCase } from '../../application/use-cases/GetNoteFormByIdUseCase';
import { GetAllNoteFormsUseCase } from '../../application/use-cases/GetAllNoteFormsUseCase';
import { UpdateNoteFormUseCase } from '../../application/use-cases/UpdateNoteFormUseCase';
import { DeleteNoteFormUseCase } from '../../application/use-cases/DeleteNoteFormUseCase';
import { INoteFormProps } from '../../domain/entities/NoteForm';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';
import { validateRequest } from '../../shared/validation/RequestValidator';

export class NoteFormController {
  constructor(
    private createNoteFormUseCase: CreateNoteFormUseCase,
    private getNoteFormByIdUseCase: GetNoteFormByIdUseCase,
    private getAllNoteFormsUseCase: GetAllNoteFormsUseCase,
    private updateNoteFormUseCase: UpdateNoteFormUseCase,
    private deleteNoteFormUseCase: DeleteNoteFormUseCase,
    private logger: Logger
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info('Creating NoteForm', { body: req.body });

      // Validate request
      const validationResult = await validateRequest(req.body, this.getCreateNoteFormSchema());
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.errors
        });
        return;
      }

      const noteform = await this.createNoteFormUseCase.execute(req.body);

      res.status(201).json({
        success: true,
        data: noteform,
        message: 'NoteForm created successfully'
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info('Getting NoteForm by id', { id });

      const noteform = await this.getNoteFormByIdUseCase.execute(id);

      res.status(200).json({
        success: true,
        data: noteform
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query;
      this.logger.info('Getting all NoteForms', { filters });

      const noteforms = await this.getAllNoteFormsUseCase.execute(filters);

      res.status(200).json({
        success: true,
        data: noteforms,
        count: noteforms.length
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info('Updating NoteForm', { id, body: req.body });

      // Validate request
      const validationResult = await validateRequest(req.body, this.getUpdateNoteFormSchema());
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.errors
        });
        return;
      }

      const noteform = await this.updateNoteFormUseCase.execute(id, req.body);

      res.status(200).json({
        success: true,
        data: noteform,
        message: 'NoteForm updated successfully'
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info('Deleting NoteForm', { id });

      await this.deleteNoteFormUseCase.execute(id);

      res.status(200).json({
        success: true,
        message: 'NoteForm deleted successfully'
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

  private getCreateNoteFormSchema(): any {
    // TODO: Implement validation schema
    return {};
  }

  private getUpdateNoteFormSchema(): any {
    // TODO: Implement validation schema
    return {};
  }
}