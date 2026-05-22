const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: { type: String, required: [true, "Name required"] },
  email: {
    type: String,
    required: [true, "Email required"],
    unique: true,
    lowercase: true,
  },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  address: { type: String },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
