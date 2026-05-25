require("dotenv").config();
require("./config/passport");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const path = require("path");
const app = express();

const userRoutes = require("./routes/user.routes");
const authRoutes = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");

mongoose
  .connect("mongodb://localhost:27017/learn-ecommerce")
  .then(() => console.log("connected to db"))
  .catch((err) => console.log("err connecting to db", err));

app.use(express.json());
app.use(cookieParser());
app.use(
  "/upload/category",
  express.static(path.join(__dirname, "upload", "category"))
);
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/category", categoryRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
