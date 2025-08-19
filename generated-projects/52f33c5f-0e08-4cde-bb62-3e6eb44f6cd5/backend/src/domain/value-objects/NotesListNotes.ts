import { ValueObject } from '../shared/ValueObject';
import { ValidationError } from '../shared/errors/ValidationError';

export interface INotesListNotesProps {
  value: any;
}

export class NotesListNotes extends ValueObject<INotesListNotesProps> {
  constructor(props: INotesListNotesProps) {
    super(props);
    this.validate();
  }

  private validate(): void {
    if (!this.props.value) {
      throw new ValidationError('notes value is required');
    }
  }

  public getValue(): any {
    return this.props.value;
  }

  public equals(other: NotesListNotes): boolean {
    return this.props.value === other.props.value;
  }
}