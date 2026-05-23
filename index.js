require("dotenv").config();
require("./config/passport");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const app = express();

const userRoutes = require("./routes/user.routes");
const authRoutes = require("./routes/auth.routes");

mongoose
  .connect("mongodb://localhost:27017/learn-ecommerce")
  .then(() => console.log("connected to db"))
  .catch((err) => console.log("err connecting to db", err));

app.use(express.json());
app.use(cookieParser());
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
