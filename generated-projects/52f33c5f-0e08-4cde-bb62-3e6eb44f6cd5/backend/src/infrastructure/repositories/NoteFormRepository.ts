import { INoteFormRepository } from './INoteFormRepository';
import { NoteForm } from '../../domain/entities/NoteForm';
import { DatabaseConnection } from '../database/DatabaseConnection';
import { Logger } from '../../shared/logging/Logger';
import { DatabaseError } from '../../shared/errors/DatabaseError';

export class NoteFormRepository implements INoteFormRepository {
  constructor(
    private db: DatabaseConnection,
    private logger: Logger
  ) {}

  async create(entity: NoteForm): Promise<NoteForm> {
    try {
      this.logger.info('Creating NoteForm', { id: entity.id });
      
      const result = await this.db.query(
        'INSERT INTO noteforms (id, props, created_at, updated_at) VALUES ($1, $2, $3, $4) RETURNING *',
        [entity.id, JSON.stringify(entity.props), entity.createdAt, entity.updatedAt]
      );

      this.logger.info('NoteForm created successfully', { id: entity.id });
      return entity;
    } catch (error) {
      this.logger.error('Error creating NoteForm', { error, id: entity.id });
      throw new DatabaseError(`Failed to create NoteForm: ${error.message}`);
    }
  }

  async findById(id: string): Promise<NoteForm | null> {
    try {
      this.logger.info('Finding NoteForm by id', { id });
      
      const result = await this.db.query(
        'SELECT * FROM noteforms WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return new NoteForm(row.props, row.id);
    } catch (error) {
      this.logger.error('Error finding NoteForm by id', { error, id });
      throw new DatabaseError(`Failed to find NoteForm: ${error.message}`);
    }
  }

  async findAll(filters?: any): Promise<NoteForm[]> {
    try {
      this.logger.info('Finding all NoteForms', { filters });
      
      let query = 'SELECT * FROM noteforms';
      const params: any[] = [];

      if (filters) {
        // TODO: Implement filtering logic
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => new NoteForm(row.props, row.id));
    } catch (error) {
      this.logger.error('Error finding all NoteForms', { error });
      throw new DatabaseError(`Failed to find NoteForms: ${error.message}`);
    }
  }

  async update(id: string, entity: NoteForm): Promise<NoteForm | null> {
    try {
      this.logger.info('Updating NoteForm', { id });
      
      const result = await this.db.query(
        'UPDATE noteforms SET props = $1, updated_at = $2 WHERE id = $3 RETURNING *',
        [JSON.stringify(entity.props), entity.updatedAt, id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info('NoteForm updated successfully', { id });
      return entity;
    } catch (error) {
      this.logger.error('Error updating NoteForm', { error, id });
      throw new DatabaseError(`Failed to update NoteForm: ${error.message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.logger.info('Deleting NoteForm', { id });
      
      const result = await this.db.query(
        'DELETE FROM noteforms WHERE id = $1 RETURNING id',
        [id]
      );

      const deleted = result.rows.length > 0;
      this.logger.info('NoteForm deleted', { id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Error deleting NoteForm', { error, id });
      throw new DatabaseError(`Failed to delete NoteForm: ${error.message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT id FROM noteforms WHERE id = $1',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error('Error checking NoteForm existence', { error, id });
      throw new DatabaseError(`Failed to check NoteForm existence: ${error.message}`);
    }
  }
}