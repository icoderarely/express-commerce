// Global Configs
require("dotenv").config();
require("./config/passport");
require("winston-mongodb");

// Third-party Modules
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const winston = require("winston");
const path = require("path");
const cors = require("cors");

// Routes Modules
const userRoutes = require("./routes/user.routes");
const authRoutes = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");

// Initialize express app
const app = express();

// Constants
const PORT = process.env.PORT || 3000;
const logger = winston.createLogger({
  // Combine timestamp + JSON format and send logs to console, file, and MongoDB.
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      level: "debug",
    }),
    new winston.transports.File({
      filename: "logs/errors.log",
      level: "error",
    }),
    new winston.transports.MongoDB({
      db: "mongodb://localhost:27017/learn-ecommerce",
      level: "error",
    }),
  ],
});

process.on("uncaughtException", (err) => {
  // Capture unexpected exceptions, flush logs, then exit to avoid bad state.
  logger.error("Uncaught Exception", err);
  logger.on("finish", () => {
    process.exit(1);
  });
  logger.end();
});

process.on("unhandledRejection", (err) => {
  // Capture rejected promises without handlers, flush logs, then exit.
  logger.error("Unhandled Promise Rejection", err);
  logger.on("finish", () => {
    process.exit(1);
  });
  logger.end();
});

// throw new Error("error new exception");
// const rejectedPromise = new Promise((resolve, reject) => {
//   reject(new Error("Error in the Promise!"));
// });

// Connect to MongoDB and log connection outcome.
mongoose
  .connect("mongodb://localhost:27017/learn-ecommerce")
  .then(() => logger.info("connected to db"))
  .catch((err) => {
    logger.error("err connecting to db", err);
    logger.on("finish", () => {
      process.exit(1);
    });
    logger.end();
  });

// Middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Serve static files
app.use(
  // Serve category image uploads as static files.
  "/upload/category",
  express.static(path.join(__dirname, "upload", "category")),
);
app.use(
  // Serve product image uploads as static files.
  "/upload/products",
  express.static(path.join(__dirname, "upload", "products")),
);

// API Routes
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);

// Custom error middleware
app.use((error, req, res, next) => {
  // Final error handler: log context and return a generic 500 response.
  logger.info("Error Middleware is Running!");
  // NOTE: Log error in a file or in db
  logger.error(error.message, {
    method: req.method,
    path: req.originalUrl,
    stack: error.stack,
  });
  return res.status(500).json({ message: "Internal Server Error!" });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`server running on port ${PORT}`);
});
