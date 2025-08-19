import { ValueObject } from '../shared/ValueObject';
import { ValidationError } from '../shared/errors/ValidationError';

export interface INotesAppNotesProps {
  value: any;
}

export class NotesAppNotes extends ValueObject<INotesAppNotesProps> {
  constructor(props: INotesAppNotesProps) {
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

  public equals(other: NotesAppNotes): boolean {
    return this.props.value === other.props.value;
  }
}