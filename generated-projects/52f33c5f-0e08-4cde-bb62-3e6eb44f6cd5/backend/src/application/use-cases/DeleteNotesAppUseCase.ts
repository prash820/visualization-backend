import { INotesAppRepository } from '../../domain/repositories/INotesAppRepository';
import { NotesApp } from '../../domain/entities/NotesApp';
import { INotesAppProps } from '../../domain/entities/NotesApp';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IDeleteNotesAppUseCase {
  execute(id: string): Promise<NotesApp>;
}

export class DeleteNotesAppUseCase implements IDeleteNotesAppUseCase {
  constructor(
    private notesappRepository: INotesAppRepository,
    private logger: Logger
  ) {}

  async execute(id: string): Promise<NotesApp> {
    try {
      this.logger.info(`Executing DeleteNotesAppUseCase`, { id });

      const existing = await this.notesappRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NotesApp with id ${id} not found`);
}
await this.notesappRepository.delete(id);
return existing;

      this.logger.info(`DeleteNotesAppUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in DeleteNotesAppUseCase`, { error, id });
      throw error;
    }
  }

  const existing = await this.notesappRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NotesApp with id ${id} not found`);
}
await this.notesappRepository.delete(id);
return existing;
}