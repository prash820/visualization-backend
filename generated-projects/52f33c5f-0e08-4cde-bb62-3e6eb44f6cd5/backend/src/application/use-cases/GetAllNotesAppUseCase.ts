import { INotesAppRepository } from '../../domain/repositories/INotesAppRepository';
import { NotesApp } from '../../domain/entities/NotesApp';
import { INotesAppProps } from '../../domain/entities/NotesApp';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IGetAllNotesAppUseCase {
  execute(filters?: any): Promise<NotesApp>;
}

export class GetAllNotesAppUseCase implements IGetAllNotesAppUseCase {
  constructor(
    private notesappRepository: INotesAppRepository,
    private logger: Logger
  ) {}

  async execute(filters?: any): Promise<NotesApp> {
    try {
      this.logger.info(`Executing GetAllNotesAppUseCase`, { filters? });

      const result = await this.notesappRepository.findAll(filters);

      this.logger.info(`GetAllNotesAppUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in GetAllNotesAppUseCase`, { error, filters? });
      throw error;
    }
  }

  const result = await this.notesappRepository.findAll(filters);
}