import mongoose, { Document } from "mongoose";
export interface IProject extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    lastPrompt: string;
    lastCode: string;
    framework: string;
    diagramType: string;
    createdAt: Date;
}
declare const _default: mongoose.Model<IProject, {}, {}, {}, mongoose.Document<unknown, {}, IProject> & IProject & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
