import { INotesAppRepository } from '../../domain/repositories/INotesAppRepository';
import { NotesApp } from '../../domain/entities/NotesApp';
import { INotesAppProps } from '../../domain/entities/NotesApp';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IUpdateNotesAppUseCase {
  execute(id: string, data: Partial<INotesAppProps>): Promise<NotesApp>;
}

export class UpdateNotesAppUseCase implements IUpdateNotesAppUseCase {
  constructor(
    private notesappRepository: INotesAppRepository,
    private logger: Logger
  ) {}

  async execute(id: string, data: Partial<INotesAppProps>): Promise<NotesApp> {
    try {
      this.logger.info(`Executing UpdateNotesAppUseCase`, { id, data });

      const existing = await this.notesappRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NotesApp with id ${id} not found`);
}
const updated = new NotesApp({ ...existing.props, ...data }, existing.id);
const result = await this.notesappRepository.update(id, updated);

      this.logger.info(`UpdateNotesAppUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in UpdateNotesAppUseCase`, { error, id, data });
      throw error;
    }
  }

  const existing = await this.notesappRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NotesApp with id ${id} not found`);
}
const updated = new NotesApp({ ...existing.props, ...data }, existing.id);
const result = await this.notesappRepository.update(id, updated);
}