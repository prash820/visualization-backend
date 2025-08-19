import { Entity, EntityId } from '../shared/Entity';
import { ValidationError } from '../shared/errors/ValidationError';
import { DomainEvent } from '../shared/events/DomainEvent';

export interface INoteFormProps {
  title: any;
  content: any;
}

export interface INoteFormMethods {

}

export class NoteForm extends Entity<INoteFormProps> implements INoteFormMethods {
  constructor(props: INoteFormProps, id?: EntityId) {
    super(props, id);
    this.validate();
  }

  private validate(): void {
    const errors: string[] = [];

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
  public static created(props: INoteFormProps, id: EntityId): DomainEvent {
    return new DomainEvent('NoteFormCreated', { props, id });
  }

  public static updated(props: Partial<INoteFormProps>, id: EntityId): DomainEvent {
    return new DomainEvent('NoteFormUpdated', { props, id });
  }

  public static deleted(id: EntityId): DomainEvent {
    return new DomainEvent('NoteFormDeleted', { id });
  }
}