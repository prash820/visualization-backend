"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI || "";
const connectDB = async () => {
    if (!MONGO_URI) {
        console.error("MongoDB connection string is missing!");
        process.exit(1);
    }
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log("Connected to MongoDB Atlas");
    }
    catch (error) {
        console.error("Error connecting to MongoDB Atlas:", error);
        process.exit(1);
    }
};
exports.default = connectDB;
//# sourceMappingURL=db.js.map