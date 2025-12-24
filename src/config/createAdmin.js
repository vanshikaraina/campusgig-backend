import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js"; // adjust relative path

const run = async () => {
  try {
    // Connect to Mongo Atlas
    await mongoose.connect(
      "mongodb+srv://CampusGig:campusgignew@cluster0.6fbzi.mongodb.net/CampusDatabase?retryWrites=true&w=majority&appName=Cluster0"
    );
    console.log("MongoDB connected");

    // Check if admin already exists
    const existing = await User.findOne({ email: "vanshika0995.be23@chitkara.edu.in" });
    if (existing) {
      console.log("Admin already exists!");
      mongoose.connection.close();
      return;
    }

    // Create admin
    const hashedPassword = await bcrypt.hash("vanshika15", 10);
    const admin = new User({
      name: "Admin",
      email: "vanshika0995.be23@chitkara.edu.in",
      password: hashedPassword,
      role: "admin",
      collegeId: "admin001"
    });

    await admin.save();
    console.log("Admin user created!");
    mongoose.connection.close();
  } catch (err) {
    console.error("Error:", err);
    mongoose.connection.close();
  }
};

run();
