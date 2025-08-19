import { ValueObject } from '../shared/ValueObject';
import { ValidationError } from '../shared/errors/ValidationError';

export interface INoteItemIdProps {
  value: any;
}

export class NoteItemId extends ValueObject<INoteItemIdProps> {
  constructor(props: INoteItemIdProps) {
    super(props);
    this.validate();
  }

  private validate(): void {
    if (!this.props.value) {
      throw new ValidationError('id value is required');
    }
  }

  public getValue(): any {
    return this.props.value;
  }

  public equals(other: NoteItemId): boolean {
    return this.props.value === other.props.value;
  }
}