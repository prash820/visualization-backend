import { INotesListRepository } from '../../domain/repositories/INotesListRepository';
import { NotesList } from '../../domain/entities/NotesList';
import { INotesListProps } from '../../domain/entities/NotesList';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface ICreateNotesListUseCase {
  execute(data: INotesListProps): Promise<NotesList>;
}

export class CreateNotesListUseCase implements ICreateNotesListUseCase {
  constructor(
    private noteslistRepository: INotesListRepository,
    private logger: Logger
  ) {}

  async execute(data: INotesListProps): Promise<NotesList> {
    try {
      this.logger.info(`Executing CreateNotesListUseCase`, { data });

      const noteslist = new NotesList(data);
const result = await this.noteslistRepository.create(noteslist);

      this.logger.info(`CreateNotesListUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in CreateNotesListUseCase`, { error, data });
      throw error;
    }
  }

  const noteslist = new NotesList(data);
const result = await this.noteslistRepository.create(noteslist);
}