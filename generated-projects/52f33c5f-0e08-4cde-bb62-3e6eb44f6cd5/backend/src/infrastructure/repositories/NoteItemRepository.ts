import { INoteItemRepository } from './INoteItemRepository';
import { NoteItem } from '../../domain/entities/NoteItem';
import { DatabaseConnection } from '../database/DatabaseConnection';
import { Logger } from '../../shared/logging/Logger';
import { DatabaseError } from '../../shared/errors/DatabaseError';

export class NoteItemRepository implements INoteItemRepository {
  constructor(
    private db: DatabaseConnection,
    private logger: Logger
  ) {}

  async create(entity: NoteItem): Promise<NoteItem> {
    try {
      this.logger.info('Creating NoteItem', { id: entity.id });
      
      const result = await this.db.query(
        'INSERT INTO noteitems (id, props, created_at, updated_at) VALUES ($1, $2, $3, $4) RETURNING *',
        [entity.id, JSON.stringify(entity.props), entity.createdAt, entity.updatedAt]
      );

      this.logger.info('NoteItem created successfully', { id: entity.id });
      return entity;
    } catch (error) {
      this.logger.error('Error creating NoteItem', { error, id: entity.id });
      throw new DatabaseError(`Failed to create NoteItem: ${error.message}`);
    }
  }

  async findById(id: string): Promise<NoteItem | null> {
    try {
      this.logger.info('Finding NoteItem by id', { id });
      
      const result = await this.db.query(
        'SELECT * FROM noteitems WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return new NoteItem(row.props, row.id);
    } catch (error) {
      this.logger.error('Error finding NoteItem by id', { error, id });
      throw new DatabaseError(`Failed to find NoteItem: ${error.message}`);
    }
  }

  async findAll(filters?: any): Promise<NoteItem[]> {
    try {
      this.logger.info('Finding all NoteItems', { filters });
      
      let query = 'SELECT * FROM noteitems';
      const params: any[] = [];

      if (filters) {
        // TODO: Implement filtering logic
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => new NoteItem(row.props, row.id));
    } catch (error) {
      this.logger.error('Error finding all NoteItems', { error });
      throw new DatabaseError(`Failed to find NoteItems: ${error.message}`);
    }
  }

  async update(id: string, entity: NoteItem): Promise<NoteItem | null> {
    try {
      this.logger.info('Updating NoteItem', { id });
      
      const result = await this.db.query(
        'UPDATE noteitems SET props = $1, updated_at = $2 WHERE id = $3 RETURNING *',
        [JSON.stringify(entity.props), entity.updatedAt, id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info('NoteItem updated successfully', { id });
      return entity;
    } catch (error) {
      this.logger.error('Error updating NoteItem', { error, id });
      throw new DatabaseError(`Failed to update NoteItem: ${error.message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.logger.info('Deleting NoteItem', { id });
      
      const result = await this.db.query(
        'DELETE FROM noteitems WHERE id = $1 RETURNING id',
        [id]
      );

      const deleted = result.rows.length > 0;
      this.logger.info('NoteItem deleted', { id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Error deleting NoteItem', { error, id });
      throw new DatabaseError(`Failed to delete NoteItem: ${error.message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT id FROM noteitems WHERE id = $1',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error('Error checking NoteItem existence', { error, id });
      throw new DatabaseError(`Failed to check NoteItem existence: ${error.message}`);
    }
  }
}