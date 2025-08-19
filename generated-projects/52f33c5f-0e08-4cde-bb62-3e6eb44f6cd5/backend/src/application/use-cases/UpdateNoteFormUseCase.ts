import { INoteFormRepository } from '../../domain/repositories/INoteFormRepository';
import { NoteForm } from '../../domain/entities/NoteForm';
import { INoteFormProps } from '../../domain/entities/NoteForm';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IUpdateNoteFormUseCase {
  execute(id: string, data: Partial<INoteFormProps>): Promise<NoteForm>;
}

export class UpdateNoteFormUseCase implements IUpdateNoteFormUseCase {
  constructor(
    private noteformRepository: INoteFormRepository,
    private logger: Logger
  ) {}

  async execute(id: string, data: Partial<INoteFormProps>): Promise<NoteForm> {
    try {
      this.logger.info(`Executing UpdateNoteFormUseCase`, { id, data });

      const existing = await this.noteformRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NoteForm with id ${id} not found`);
}
const updated = new NoteForm({ ...existing.props, ...data }, existing.id);
const result = await this.noteformRepository.update(id, updated);

      this.logger.info(`UpdateNoteFormUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in UpdateNoteFormUseCase`, { error, id, data });
      throw error;
    }
  }

  const existing = await this.noteformRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NoteForm with id ${id} not found`);
}
const updated = new NoteForm({ ...existing.props, ...data }, existing.id);
const result = await this.noteformRepository.update(id, updated);
}