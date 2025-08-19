import { INoteFormRepository } from '../../domain/repositories/INoteFormRepository';
import { NoteForm } from '../../domain/entities/NoteForm';
import { INoteFormProps } from '../../domain/entities/NoteForm';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface ICreateNoteFormUseCase {
  execute(data: INoteFormProps): Promise<NoteForm>;
}

export class CreateNoteFormUseCase implements ICreateNoteFormUseCase {
  constructor(
    private noteformRepository: INoteFormRepository,
    private logger: Logger
  ) {}

  async execute(data: INoteFormProps): Promise<NoteForm> {
    try {
      this.logger.info(`Executing CreateNoteFormUseCase`, { data });

      const noteform = new NoteForm(data);
const result = await this.noteformRepository.create(noteform);

      this.logger.info(`CreateNoteFormUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in CreateNoteFormUseCase`, { error, data });
      throw error;
    }
  }

  const noteform = new NoteForm(data);
const result = await this.noteformRepository.create(noteform);
}