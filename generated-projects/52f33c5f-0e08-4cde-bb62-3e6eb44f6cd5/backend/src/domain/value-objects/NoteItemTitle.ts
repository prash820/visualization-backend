import { ValueObject } from '../shared/ValueObject';
import { ValidationError } from '../shared/errors/ValidationError';

export interface INoteItemTitleProps {
  value: any;
}

export class NoteItemTitle extends ValueObject<INoteItemTitleProps> {
  constructor(props: INoteItemTitleProps) {
    super(props);
    this.validate();
  }

  private validate(): void {
    if (!this.props.value) {
      throw new ValidationError('title value is required');
    }
  }

  public getValue(): any {
    return this.props.value;
  }

  public equals(other: NoteItemTitle): boolean {
    return this.props.value === other.props.value;
  }
}