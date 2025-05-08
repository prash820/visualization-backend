import mongoose, { Document } from 'mongoose';
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
export declare const UmlDiagram: mongoose.Model<IUmlDiagram, {}, {}, {}, mongoose.Document<unknown, {}, IUmlDiagram> & IUmlDiagram & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
