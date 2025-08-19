import { INoteItemRepository } from '../../domain/repositories/INoteItemRepository';
import { NoteItem } from '../../domain/entities/NoteItem';
import { INoteItemProps } from '../../domain/entities/NoteItem';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface ICreateNoteItemUseCase {
  execute(data: INoteItemProps): Promise<NoteItem>;
}

export class CreateNoteItemUseCase implements ICreateNoteItemUseCase {
  constructor(
    private noteitemRepository: INoteItemRepository,
    private logger: Logger
  ) {}

  async execute(data: INoteItemProps): Promise<NoteItem> {
    try {
      this.logger.info(`Executing CreateNoteItemUseCase`, { data });

      const noteitem = new NoteItem(data);
const result = await this.noteitemRepository.create(noteitem);

      this.logger.info(`CreateNoteItemUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in CreateNoteItemUseCase`, { error, data });
      throw error;
    }
  }

  const noteitem = new NoteItem(data);
const result = await this.noteitemRepository.create(noteitem);
}