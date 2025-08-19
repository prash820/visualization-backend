import { ValueObject } from '../shared/ValueObject';
import { ValidationError } from '../shared/errors/ValidationError';

export interface INoteFormContentProps {
  value: any;
}

export class NoteFormContent extends ValueObject<INoteFormContentProps> {
  constructor(props: INoteFormContentProps) {
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

  public equals(other: NoteFormContent): boolean {
    return this.props.value === other.props.value;
  }
}