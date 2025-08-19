import { NotesList } from '../../domain/entities/NotesList';
import { INotesListProps } from '../../domain/entities/NotesList';

export interface INotesListRepository {
  create(entity: NotesList): Promise<NotesList>;
  findById(id: string): Promise<NotesList | null>;
  findAll(filters?: any): Promise<NotesList[]>;
  update(id: string, entity: NotesList): Promise<NotesList | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}