import { INotesListRepository } from '../../domain/repositories/INotesListRepository';
import { NotesList } from '../../domain/entities/NotesList';
import { INotesListProps } from '../../domain/entities/NotesList';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IGetAllNotesListUseCase {
  execute(filters?: any): Promise<NotesList>;
}

export class GetAllNotesListUseCase implements IGetAllNotesListUseCase {
  constructor(
    private noteslistRepository: INotesListRepository,
    private logger: Logger
  ) {}

  async execute(filters?: any): Promise<NotesList> {
    try {
      this.logger.info(`Executing GetAllNotesListUseCase`, { filters? });

      const result = await this.noteslistRepository.findAll(filters);

      this.logger.info(`GetAllNotesListUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in GetAllNotesListUseCase`, { error, filters? });
      throw error;
    }
  }

  const result = await this.noteslistRepository.findAll(filters);
}