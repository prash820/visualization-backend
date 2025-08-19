import { INotesAppRepository } from '../../domain/repositories/INotesAppRepository';
import { NotesApp } from '../../domain/entities/NotesApp';
import { INotesAppProps } from '../../domain/entities/NotesApp';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface ICreateNotesAppUseCase {
  execute(data: INotesAppProps): Promise<NotesApp>;
}

export class CreateNotesAppUseCase implements ICreateNotesAppUseCase {
  constructor(
    private notesappRepository: INotesAppRepository,
    private logger: Logger
  ) {}

  async execute(data: INotesAppProps): Promise<NotesApp> {
    try {
      this.logger.info(`Executing CreateNotesAppUseCase`, { data });

      const notesapp = new NotesApp(data);
const result = await this.notesappRepository.create(notesapp);

      this.logger.info(`CreateNotesAppUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in CreateNotesAppUseCase`, { error, data });
      throw error;
    }
  }

  const notesapp = new NotesApp(data);
const result = await this.notesappRepository.create(notesapp);
}