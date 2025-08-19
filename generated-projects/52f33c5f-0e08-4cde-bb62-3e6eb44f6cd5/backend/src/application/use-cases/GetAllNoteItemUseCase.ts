import { INoteItemRepository } from '../../domain/repositories/INoteItemRepository';
import { NoteItem } from '../../domain/entities/NoteItem';
import { INoteItemProps } from '../../domain/entities/NoteItem';
import { ValidationError } from '../../shared/errors/ValidationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { Logger } from '../../shared/logging/Logger';

export interface IGetAllNoteItemUseCase {
  execute(filters?: any): Promise<NoteItem>;
}

export class GetAllNoteItemUseCase implements IGetAllNoteItemUseCase {
  constructor(
    private noteitemRepository: INoteItemRepository,
    private logger: Logger
  ) {}

  async execute(filters?: any): Promise<NoteItem> {
    try {
      this.logger.info(`Executing GetAllNoteItemUseCase`, { filters? });

      const result = await this.noteitemRepository.findAll(filters);

      this.logger.info(`GetAllNoteItemUseCase executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error in GetAllNoteItemUseCase`, { error, filters? });
      throw error;
    }
  }

  const result = await this.noteitemRepository.findAll(filters);
}