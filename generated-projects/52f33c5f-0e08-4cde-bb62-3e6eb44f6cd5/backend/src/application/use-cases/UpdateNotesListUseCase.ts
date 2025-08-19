import { INotesListRepository } from '../../domain/repositories/INotesListRepository';
import { NotesList } from '../../domain/entities/NotesList';
import { INotesListProps } from '../../domain/entities/NotesList';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IUpdateNotesListUseCase {
  execute(id: string, data: Partial<INotesListProps>): Promise<NotesList>;
}

export class UpdateNotesListUseCase implements IUpdateNotesListUseCase {
  constructor(
    private noteslistRepository: INotesListRepository,
    private logger: Logger
  ) {}

  async execute(id: string, data: Partial<INotesListProps>): Promise<NotesList> {
    try {
      this.logger.info(`Executing UpdateNotesListUseCase`, { id, data });

      const existing = await this.noteslistRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NotesList with id ${id} not found`);
}
const updated = new NotesList({ ...existing.props, ...data }, existing.id);
const result = await this.noteslistRepository.update(id, updated);

      this.logger.info(`UpdateNotesListUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in UpdateNotesListUseCase`, { error, id, data });
      throw error;
    }
  }

  const existing = await this.noteslistRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NotesList with id ${id} not found`);
}
const updated = new NotesList({ ...existing.props, ...data }, existing.id);
const result = await this.noteslistRepository.update(id, updated);
}