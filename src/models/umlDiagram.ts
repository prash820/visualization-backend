import mongoose, { Document, Schema } from 'mongoose';

export interface IUmlDiagram extends Document {
  projectId: string;
  diagramType: string;
  diagramData: any;
  diagrams?: {
    class?: string;
    sequence?: string;
    entity?: string;
    component?: string;
  };
  prompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UmlDiagramSchema = new Schema<IUmlDiagram>(
  {
    projectId: {
      type: String,
      required: true,
    },
    diagramType: {
      type: String,
      required: true,
      enum: ['class', 'sequence', 'entity', 'component'],
    },
    diagramData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    diagrams: {
      class: String,
      sequence: String,
      entity: String,
      component: String,
    },
    prompt: String,
  },
  {
    timestamps: true,
  }
);

export const UmlDiagram = mongoose.model<IUmlDiagram>('UmlDiagram', UmlDiagramSchema); 