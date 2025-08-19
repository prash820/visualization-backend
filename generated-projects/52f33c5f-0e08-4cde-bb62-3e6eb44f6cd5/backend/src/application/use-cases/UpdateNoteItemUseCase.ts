import { INoteItemRepository } from '../../domain/repositories/INoteItemRepository';
import { NoteItem } from '../../domain/entities/NoteItem';
import { INoteItemProps } from '../../domain/entities/NoteItem';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IUpdateNoteItemUseCase {
  execute(id: string, data: Partial<INoteItemProps>): Promise<NoteItem>;
}

export class UpdateNoteItemUseCase implements IUpdateNoteItemUseCase {
  constructor(
    private noteitemRepository: INoteItemRepository,
    private logger: Logger
  ) {}

  async execute(id: string, data: Partial<INoteItemProps>): Promise<NoteItem> {
    try {
      this.logger.info(`Executing UpdateNoteItemUseCase`, { id, data });

      const existing = await this.noteitemRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NoteItem with id ${id} not found`);
}
const updated = new NoteItem({ ...existing.props, ...data }, existing.id);
const result = await this.noteitemRepository.update(id, updated);

      this.logger.info(`UpdateNoteItemUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in UpdateNoteItemUseCase`, { error, id, data });
      throw error;
    }
  }

  const existing = await this.noteitemRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NoteItem with id ${id} not found`);
}
const updated = new NoteItem({ ...existing.props, ...data }, existing.id);
const result = await this.noteitemRepository.update(id, updated);
}