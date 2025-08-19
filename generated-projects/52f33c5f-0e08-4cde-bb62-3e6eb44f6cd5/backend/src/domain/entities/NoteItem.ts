import { Entity, EntityId } from '../shared/Entity';
import { ValidationError } from '../shared/errors/ValidationError';
import { DomainEvent } from '../shared/events/DomainEvent';

export interface INoteItemProps {
  id: any;
  title: any;
  content: any;
}

export interface INoteItemMethods {

}

export class NoteItem extends Entity<INoteItemProps> implements INoteItemMethods {
  constructor(props: INoteItemProps, id?: EntityId) {
    super(props, id);
    this.validate();
  }

  private validate(): void {
    const errors: string[] = [];

    if (!this.props.id) {
      errors.push('id is required');
    }
    if (!this.props.title) {
      errors.push('title is required');
    }
    if (!this.props.content) {
      errors.push('content is required');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }



  // Domain Events
  public static created(props: INoteItemProps, id: EntityId): DomainEvent {
    return new DomainEvent('NoteItemCreated', { props, id });
  }

  public static updated(props: Partial<INoteItemProps>, id: EntityId): DomainEvent {
    return new DomainEvent('NoteItemUpdated', { props, id });
  }

  public static deleted(id: EntityId): DomainEvent {
    return new DomainEvent('NoteItemDeleted', { id });
  }
}