import mongoose, { Document } from "mongoose";
export interface IUser extends Document {
    email: string;
    password: string;
    createdAt?: Date;
    comparePassword: (password: string) => Promise<boolean>;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
