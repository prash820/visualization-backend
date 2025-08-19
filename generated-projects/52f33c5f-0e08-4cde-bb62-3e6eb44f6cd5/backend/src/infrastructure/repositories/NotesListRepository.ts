import { INotesListRepository } from './INotesListRepository';
import { NotesList } from '../../domain/entities/NotesList';
import { DatabaseConnection } from '../database/DatabaseConnection';
import { Logger } from '../../shared/logging/Logger';
import { DatabaseError } from '../../shared/errors/DatabaseError';

export class NotesListRepository implements INotesListRepository {
  constructor(
    private db: DatabaseConnection,
    private logger: Logger
  ) {}

  async create(entity: NotesList): Promise<NotesList> {
    try {
      this.logger.info('Creating NotesList', { id: entity.id });
      
      const result = await this.db.query(
        'INSERT INTO noteslists (id, props, created_at, updated_at) VALUES ($1, $2, $3, $4) RETURNING *',
        [entity.id, JSON.stringify(entity.props), entity.createdAt, entity.updatedAt]
      );

      this.logger.info('NotesList created successfully', { id: entity.id });
      return entity;
    } catch (error) {
      this.logger.error('Error creating NotesList', { error, id: entity.id });
      throw new DatabaseError(`Failed to create NotesList: ${error.message}`);
    }
  }

  async findById(id: string): Promise<NotesList | null> {
    try {
      this.logger.info('Finding NotesList by id', { id });
      
      const result = await this.db.query(
        'SELECT * FROM noteslists WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return new NotesList(row.props, row.id);
    } catch (error) {
      this.logger.error('Error finding NotesList by id', { error, id });
      throw new DatabaseError(`Failed to find NotesList: ${error.message}`);
    }
  }

  async findAll(filters?: any): Promise<NotesList[]> {
    try {
      this.logger.info('Finding all NotesLists', { filters });
      
      let query = 'SELECT * FROM noteslists';
      const params: any[] = [];

      if (filters) {
        // TODO: Implement filtering logic
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => new NotesList(row.props, row.id));
    } catch (error) {
      this.logger.error('Error finding all NotesLists', { error });
      throw new DatabaseError(`Failed to find NotesLists: ${error.message}`);
    }
  }

  async update(id: string, entity: NotesList): Promise<NotesList | null> {
    try {
      this.logger.info('Updating NotesList', { id });
      
      const result = await this.db.query(
        'UPDATE noteslists SET props = $1, updated_at = $2 WHERE id = $3 RETURNING *',
        [JSON.stringify(entity.props), entity.updatedAt, id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info('NotesList updated successfully', { id });
      return entity;
    } catch (error) {
      this.logger.error('Error updating NotesList', { error, id });
      throw new DatabaseError(`Failed to update NotesList: ${error.message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.logger.info('Deleting NotesList', { id });
      
      const result = await this.db.query(
        'DELETE FROM noteslists WHERE id = $1 RETURNING id',
        [id]
      );

      const deleted = result.rows.length > 0;
      this.logger.info('NotesList deleted', { id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Error deleting NotesList', { error, id });
      throw new DatabaseError(`Failed to delete NotesList: ${error.message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT id FROM noteslists WHERE id = $1',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error('Error checking NotesList existence', { error, id });
      throw new DatabaseError(`Failed to check NotesList existence: ${error.message}`);
    }
  }
}