import { INoteItemRepository } from '../../domain/repositories/INoteItemRepository';
import { NoteItem } from '../../domain/entities/NoteItem';
import { INoteItemProps } from '../../domain/entities/NoteItem';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IGetByIdNoteItemUseCase {
  execute(id: string): Promise<NoteItem>;
}

export class GetByIdNoteItemUseCase implements IGetByIdNoteItemUseCase {
  constructor(
    private noteitemRepository: INoteItemRepository,
    private logger: Logger
  ) {}

  async execute(id: string): Promise<NoteItem> {
    try {
      this.logger.info(`Executing GetByIdNoteItemUseCase`, { id });

      const result = await this.noteitemRepository.findById(id);
if (!result) {
  throw new NotFoundError(`NoteItem with id ${id} not found`);
}

      this.logger.info(`GetByIdNoteItemUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in GetByIdNoteItemUseCase`, { error, id });
      throw error;
    }
  }

  const result = await this.noteitemRepository.findById(id);
if (!result) {
  throw new NotFoundError(`NoteItem with id ${id} not found`);
}
}