import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js"; // <-- update path to your user model

dotenv.config();

async function deleteAllUsers() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ MONGO_URI is missing in .env file");
    process.exit(1);
  }

  try {
    console.log("✅ Connecting to MongoDB...");
    await mongoose.connect(uri);

    const result = await User.updateOne(
  { email: "john.doe@example.com" },
  { $set: { role: "admin" } }
);
    console.log(`✅ Updated user role to admin`);

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

deleteAllUsers();
