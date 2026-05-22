const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const authMiddleware = require("../middleware/auth.middleware");

const createUserSchema = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  address: Joi.string().min(5).required(),
});

const loginUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

router.post("/register", async (req, res) => {
  const { name, email, password, address } = req.body;

  const joiValidation = createUserSchema.validate(req.body);
  if (joiValidation.error) {
    return res.status(400).json(joiValidation.error.details[0].message);
  }

  const user = await User.findOne({ email: email });
  if (user) {
    return res.status(400).json({ message: "User already exists." });
  }

  const hashedPass = await bcrypt.hash(password, 10);

  const newUser = new User({
    name: name,
    email: email,
    password: hashedPass,
    address: address,
  });
  await newUser.save();

  const token = generateToken({ _id: newUser._id, name: newUser.name });

  console.log(token);
  res.status(201).json(token);
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const joiValidation = loginUserSchema.validate(req.body);
  if (joiValidation.error) {
    return res.status(400).json(joiValidation.error.details[0].message);
  }

  const user = await User.findOne({ email: email });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const validPass = await bcrypt.compare(password, user.password);
  if (!validPass) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = generateToken({ _id: user._id, name: user.name });

  res.json(token);
});

router.get("/", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.json(user);
});

const generateToken = (data) => {
  return jwt.sign(
    data,
    process.env.JWT_SECRET_KEY,
    { expiresIn: 2 * 60 * 60 * 1000 }, // or "2h" / "1d"
  );
};

module.exports = router;
