
// //models/User.js
// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true }, // hashed
//     role: { type: String, enum: ["employer", "freelancer"], required: true },
//     collegeId: { type: String, required: true },
//     branch: String,
//     year: String,
//     skills: [String],
//     portfolio: String,
//     rating: { type: Number, default: 0 },
//     badges: [String]
//   },
//   { timestamps: true }
// );

// export default mongoose.model("User", userSchema);

// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // hashed password
    role: { type: String, enum: ["employer", "freelancer","admin"], required: true },
    collegeId: { type: String, required: true },
    branch: { type: String },
    college: { type: String },
    year: { type: String },

    // Profile-related fields
    bio: { type: String, default: "" },
    profilePic: { type: String, default: "" },

    // Ratings & Badges
    rating: { type: Number, default: 0 },   // average rating
    ratings: [{ type: Number, default: [] }] ,// store all ratings

    badges: [String],
    jobsPosted: { type: Number, default: 0 } , // ✅ add this
    jobsAccepted: { type: Number, default: 0 }, // ✅ add this

    // 👇 Add this field for passed jobs
    passedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],

    // Skills & Portfolio
    skills: { type: [String], default: [] },
    portfolio: [
      {
        title: { type: String },
        img: { type: String },
        link: { type: String },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // Campus gigs / tasks completed
    tasksDone: [
      {
        title: { type: String },
        status: { type: String, enum: ["Ongoing", "Completed"], default: "Ongoing" }
      }
    ],

    // Contacts / Social Links
    contacts: {
      phone: { type: String },  
      github: { type: String },
      linkedin: { type: String },
      email: { type: String }
    },
  // 🆕 New feature: saved jobs (wishlist)
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
