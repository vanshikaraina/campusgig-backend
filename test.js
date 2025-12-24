// test.js
import mongoose from "mongoose";

const uri = "mongodb+srv://CampusGig:campusgignew@cluster0.6fbzi.mongodb.net/CampusDatabase?retryWrites=true&w=majority&appName=Cluster0";
console.log("DEBUG: URI type:", typeof uri, "value:", uri);

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected"))
  .catch(err => console.error("❌ Error:", err.message));
