import { Entity, EntityId } from '../shared/Entity';
import { ValidationError } from '../shared/errors/ValidationError';
import { DomainEvent } from '../shared/events/DomainEvent';

export interface INotesListProps {
  notes: any;
}

export interface INotesListMethods {

}

export class NotesList extends Entity<INotesListProps> implements INotesListMethods {
  constructor(props: INotesListProps, id?: EntityId) {
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
  public static created(props: INotesListProps, id: EntityId): DomainEvent {
    return new DomainEvent('NotesListCreated', { props, id });
  }

  public static updated(props: Partial<INotesListProps>, id: EntityId): DomainEvent {
    return new DomainEvent('NotesListUpdated', { props, id });
  }

  public static deleted(id: EntityId): DomainEvent {
    return new DomainEvent('NotesListDeleted', { id });
  }
}