import { INoteFormRepository } from '../../domain/repositories/INoteFormRepository';
import { NoteForm } from '../../domain/entities/NoteForm';
import { INoteFormProps } from '../../domain/entities/NoteForm';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IGetAllNoteFormUseCase {
  execute(filters?: any): Promise<NoteForm>;
}

export class GetAllNoteFormUseCase implements IGetAllNoteFormUseCase {
  constructor(
    private noteformRepository: INoteFormRepository,
    private logger: Logger
  ) {}

  async execute(filters?: any): Promise<NoteForm> {
    try {
      this.logger.info(`Executing GetAllNoteFormUseCase`, { filters? });

      const result = await this.noteformRepository.findAll(filters);

      this.logger.info(`GetAllNoteFormUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in GetAllNoteFormUseCase`, { error, filters? });
      throw error;
    }
  }

  const result = await this.noteformRepository.findAll(filters);
}