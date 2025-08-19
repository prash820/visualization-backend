import { INoteFormRepository } from '../../domain/repositories/INoteFormRepository';
import { NoteForm } from '../../domain/entities/NoteForm';
import { INoteFormProps } from '../../domain/entities/NoteForm';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IGetByIdNoteFormUseCase {
  execute(id: string): Promise<NoteForm>;
}

export class GetByIdNoteFormUseCase implements IGetByIdNoteFormUseCase {
  constructor(
    private noteformRepository: INoteFormRepository,
    private logger: Logger
  ) {}

  async execute(id: string): Promise<NoteForm> {
    try {
      this.logger.info(`Executing GetByIdNoteFormUseCase`, { id });

      const result = await this.noteformRepository.findById(id);
if (!result) {
  throw new NotFoundError(`NoteForm with id ${id} not found`);
}

      this.logger.info(`GetByIdNoteFormUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in GetByIdNoteFormUseCase`, { error, id });
      throw error;
    }
  }

  const result = await this.noteformRepository.findById(id);
if (!result) {
  throw new NotFoundError(`NoteForm with id ${id} not found`);
}
}