import { NotesApp } from '../../domain/entities/NotesApp';
import { INotesAppProps } from '../../domain/entities/NotesApp';

export interface INotesAppRepository {
  create(entity: NotesApp): Promise<NotesApp>;
  findById(id: string): Promise<NotesApp | null>;
  findAll(filters?: any): Promise<NotesApp[]>;
  update(id: string, entity: NotesApp): Promise<NotesApp | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}