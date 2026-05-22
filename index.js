const express = require("express");
const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/learn-ecommerce")
  .then(() => console.log("connected to db"))
  .catch((err) => console.log("err connecting to db", err));

const app = express();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
