import mongoose, { Schema, Document } from 'mongoose';

export interface ITodo extends Document {
  task: string;
}

const TodoSchema: Schema = new Schema({
  task: { type: String, required: true }
});

export default mongoose.model<ITodo>('Todo', TodoSchema);