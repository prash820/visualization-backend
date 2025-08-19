import { NoteItem } from '../../domain/entities/NoteItem';
import { INoteItemProps } from '../../domain/entities/NoteItem';

export interface INoteItemRepository {
  create(entity: NoteItem): Promise<NoteItem>;
  findById(id: string): Promise<NoteItem | null>;
  findAll(filters?: any): Promise<NoteItem[]>;
  update(id: string, entity: NoteItem): Promise<NoteItem | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}