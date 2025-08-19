import { INotesAppRepository } from './INotesAppRepository';
import { NotesApp } from '../../domain/entities/NotesApp';
import { DatabaseConnection } from '../database/DatabaseConnection';
import { Logger } from '../../shared/logging/Logger';
import { DatabaseError } from '../../shared/errors/DatabaseError';

export class NotesAppRepository implements INotesAppRepository {
  constructor(
    private db: DatabaseConnection,
    private logger: Logger
  ) {}

  async create(entity: NotesApp): Promise<NotesApp> {
    try {
      this.logger.info('Creating NotesApp', { id: entity.id });
      
      const result = await this.db.query(
        'INSERT INTO notesapps (id, props, created_at, updated_at) VALUES ($1, $2, $3, $4) RETURNING *',
        [entity.id, JSON.stringify(entity.props), entity.createdAt, entity.updatedAt]
      );

      this.logger.info('NotesApp created successfully', { id: entity.id });
      return entity;
    } catch (error) {
      this.logger.error('Error creating NotesApp', { error, id: entity.id });
      throw new DatabaseError(`Failed to create NotesApp: ${error.message}`);
    }
  }

  async findById(id: string): Promise<NotesApp | null> {
    try {
      this.logger.info('Finding NotesApp by id', { id });
      
      const result = await this.db.query(
        'SELECT * FROM notesapps WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return new NotesApp(row.props, row.id);
    } catch (error) {
      this.logger.error('Error finding NotesApp by id', { error, id });
      throw new DatabaseError(`Failed to find NotesApp: ${error.message}`);
    }
  }

  async findAll(filters?: any): Promise<NotesApp[]> {
    try {
      this.logger.info('Finding all NotesApps', { filters });
      
      let query = 'SELECT * FROM notesapps';
      const params: any[] = [];

      if (filters) {
        // TODO: Implement filtering logic
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => new NotesApp(row.props, row.id));
    } catch (error) {
      this.logger.error('Error finding all NotesApps', { error });
      throw new DatabaseError(`Failed to find NotesApps: ${error.message}`);
    }
  }

  async update(id: string, entity: NotesApp): Promise<NotesApp | null> {
    try {
      this.logger.info('Updating NotesApp', { id });
      
      const result = await this.db.query(
        'UPDATE notesapps SET props = $1, updated_at = $2 WHERE id = $3 RETURNING *',
        [JSON.stringify(entity.props), entity.updatedAt, id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info('NotesApp updated successfully', { id });
      return entity;
    } catch (error) {
      this.logger.error('Error updating NotesApp', { error, id });
      throw new DatabaseError(`Failed to update NotesApp: ${error.message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.logger.info('Deleting NotesApp', { id });
      
      const result = await this.db.query(
        'DELETE FROM notesapps WHERE id = $1 RETURNING id',
        [id]
      );

      const deleted = result.rows.length > 0;
      this.logger.info('NotesApp deleted', { id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Error deleting NotesApp', { error, id });
      throw new DatabaseError(`Failed to delete NotesApp: ${error.message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT id FROM notesapps WHERE id = $1',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error('Error checking NotesApp existence', { error, id });
      throw new DatabaseError(`Failed to check NotesApp existence: ${error.message}`);
    }
  }
}