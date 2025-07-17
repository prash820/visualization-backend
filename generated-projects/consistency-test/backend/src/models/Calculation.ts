import { Schema, model, Document } from 'mongoose';

interface ICalculation extends Document {
  expression: string;
  result: number;
  timestamp: Date;
}

const CalculationSchema = new Schema<ICalculation>({
  expression: { type: String, required: true },
  result: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Calculation = model<ICalculation>('Calculation', CalculationSchema);

export { Calculation, ICalculation };