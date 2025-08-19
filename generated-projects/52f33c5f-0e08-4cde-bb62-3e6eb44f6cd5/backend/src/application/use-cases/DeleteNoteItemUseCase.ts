import { INoteItemRepository } from '../../domain/repositories/INoteItemRepository';
import { NoteItem } from '../../domain/entities/NoteItem';
import { INoteItemProps } from '../../domain/entities/NoteItem';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IDeleteNoteItemUseCase {
  execute(id: string): Promise<NoteItem>;
}

export class DeleteNoteItemUseCase implements IDeleteNoteItemUseCase {
  constructor(
    private noteitemRepository: INoteItemRepository,
    private logger: Logger
  ) {}

  async execute(id: string): Promise<NoteItem> {
    try {
      this.logger.info(`Executing DeleteNoteItemUseCase`, { id });

      const existing = await this.noteitemRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NoteItem with id ${id} not found`);
}
await this.noteitemRepository.delete(id);
return existing;

      this.logger.info(`DeleteNoteItemUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in DeleteNoteItemUseCase`, { error, id });
      throw error;
    }
  }

  const existing = await this.noteitemRepository.findById(id);
if (!existing) {
  throw new NotFoundError(`NoteItem with id ${id} not found`);
}
await this.noteitemRepository.delete(id);
return existing;
}