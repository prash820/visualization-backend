import { ValueObject } from '../shared/ValueObject';
import { ValidationError } from '../shared/errors/ValidationError';

export interface INoteFormTitleProps {
  value: any;
}

export class NoteFormTitle extends ValueObject<INoteFormTitleProps> {
  constructor(props: INoteFormTitleProps) {
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

  public equals(other: NoteFormTitle): boolean {
    return this.props.value === other.props.value;
  }
}