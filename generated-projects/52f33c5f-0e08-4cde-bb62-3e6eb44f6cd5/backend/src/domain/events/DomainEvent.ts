export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;

  constructor(
    public readonly eventType: string,
    public readonly eventData: any
  ) {
    this.occurredOn = new Date();
    this.eventId = this.generateEventId();
  }

  private generateEventId(): string {
    return `${this.eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public abstract getAggregateId(): string;
}