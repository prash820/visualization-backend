import { INotesListRepository } from '../../domain/repositories/INotesListRepository';
import { NotesList } from '../../domain/entities/NotesList';
import { INotesListProps } from '../../domain/entities/NotesList';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IGetByIdNotesListUseCase {
  execute(id: string): Promise<NotesList>;
}

export class GetByIdNotesListUseCase implements IGetByIdNotesListUseCase {
  constructor(
    private noteslistRepository: INotesListRepository,
    private logger: Logger
  ) {}

  async execute(id: string): Promise<NotesList> {
    try {
      this.logger.info(`Executing GetByIdNotesListUseCase`, { id });

      const result = await this.noteslistRepository.findById(id);
if (!result) {
  throw new NotFoundError(`NotesList with id ${id} not found`);
}

      this.logger.info(`GetByIdNotesListUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in GetByIdNotesListUseCase`, { error, id });
      throw error;
    }
  }

  const result = await this.noteslistRepository.findById(id);
if (!result) {
  throw new NotFoundError(`NotesList with id ${id} not found`);
}
}