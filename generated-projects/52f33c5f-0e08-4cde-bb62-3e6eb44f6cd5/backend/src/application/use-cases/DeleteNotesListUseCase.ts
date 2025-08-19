import { INotesListRepository } from '../../domain/repositories/INotesListRepository';
import { NotesList } from '../../domain/entities/NotesList';
import { INotesListProps } from '../../domain/entities/NotesList';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IDeleteNotesListUseCase {
  execute(id: string): Promise<NotesList>;
}

export class DeleteNotesListUseCase implements IDeleteNotesListUseCase {
  constructor(
    private noteslistRepository: INotesListRepository,
    private logger: Logger
  ) {}

  async execute(id: string): Promise<NotesList> {
    try {
      this.logger.info(`Executing DeleteNotesListUseCase`, { id });

      const existing = await this.noteslistRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NotesList with id ${id} not found`);
}
await this.noteslistRepository.delete(id);
return existing;

      this.logger.info(`DeleteNotesListUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in DeleteNotesListUseCase`, { error, id });
      throw error;
    }
  }

  const existing = await this.noteslistRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NotesList with id ${id} not found`);
}
await this.noteslistRepository.delete(id);
return existing;
}