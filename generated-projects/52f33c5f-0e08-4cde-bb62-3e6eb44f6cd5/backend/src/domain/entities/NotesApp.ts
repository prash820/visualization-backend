import { Entity, EntityId } from '../shared/Entity';
import { ValidationError } from '../shared/errors/ValidationError';
import { DomainEvent } from '../shared/events/DomainEvent';

export interface INotesAppProps {
  notes: any;
}

export interface INotesAppMethods {

}

export class NotesApp extends Entity<INotesAppProps> implements INotesAppMethods {
  constructor(props: INotesAppProps, id?: EntityId) {
    super(props, id);
    this.validate();
  }

  private validate(): void {
    const errors: string[] = [];

    if (!this.props.notes) {
      errors.push('notes is required');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }



  // Domain Events
  public static created(props: INotesAppProps, id: EntityId): DomainEvent {
    return new DomainEvent('NotesAppCreated', { props, id });
  }

  public static updated(props: Partial<INotesAppProps>, id: EntityId): DomainEvent {
    return new DomainEvent('NotesAppUpdated', { props, id });
  }

  public static deleted(id: EntityId): DomainEvent {
    return new DomainEvent('NotesAppDeleted', { id });
  }
}