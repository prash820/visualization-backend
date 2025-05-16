import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "";

const connectDB = async () => {
  if (!MONGO_URI) {
    console.error("MongoDB connection string is missing!");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI, {
      tls: true,
    });
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
