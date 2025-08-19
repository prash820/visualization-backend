import { ValueObject } from '../shared/ValueObject';
import { ValidationError } from '../shared/errors/ValidationError';

export interface INoteItemContentProps {
  value: any;
}

export class NoteItemContent extends ValueObject<INoteItemContentProps> {
  constructor(props: INoteItemContentProps) {
    super(props);
    this.validate();
  }

  private validate(): void {
    if (!this.props.value) {
      throw new ValidationError('content value is required');
    }
  }

  public getValue(): any {
    return this.props.value;
  }

  public equals(other: NoteItemContent): boolean {
    return this.props.value === other.props.value;
  }
}