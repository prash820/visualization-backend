import { INoteFormRepository } from '../../domain/repositories/INoteFormRepository';
import { NoteForm } from '../../domain/entities/NoteForm';
import { INoteFormProps } from '../../domain/entities/NoteForm';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IDeleteNoteFormUseCase {
  execute(id: string): Promise<NoteForm>;
}

export class DeleteNoteFormUseCase implements IDeleteNoteFormUseCase {
  constructor(
    private noteformRepository: INoteFormRepository,
    private logger: Logger
  ) {}

  async execute(id: string): Promise<NoteForm> {
    try {
      this.logger.info(`Executing DeleteNoteFormUseCase`, { id });

      const existing = await this.noteformRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NoteForm with id ${id} not found`);
}
await this.noteformRepository.delete(id);
return existing;

      this.logger.info(`DeleteNoteFormUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in DeleteNoteFormUseCase`, { error, id });
      throw error;
    }
  }

  const existing = await this.noteformRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NoteForm with id ${id} not found`);
}
await this.noteformRepository.delete(id);
return existing;
}