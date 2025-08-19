import { NoteForm } from '../../domain/entities/NoteForm';
import { INoteFormProps } from '../../domain/entities/NoteForm';

export interface INoteFormRepository {
  create(entity: NoteForm): Promise<NoteForm>;
  findById(id: string): Promise<NoteForm | null>;
  findAll(filters?: any): Promise<NoteForm[]>;
  update(id: string, entity: NoteForm): Promise<NoteForm | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}