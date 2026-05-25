const express = require("express");
const multer = require("multer");
const router = express.Router();
const Category = require("../models/category.model");

// we define how and where files should be stored on our server
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "upload/category");
  },
  filename: (req, file, cb) => {
    const timeStamp = Date.now();
    const originalName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.-]/g, "");
    cb(null, `${timeStamp}-${originalName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedType = ["image/jpeg", "image/png", "image/gif"];

  if (allowedType.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("invalid file type. only jpeg, png, gif allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

// on frontend we need to use <input type="file" name="icon" />
// file info in req.file and form data in req.body
router.post("/", upload.single("icon"), async (req, res) => {
  if (!req.body.name || !req.file) {
    return res.status(400).json({ message: "name and icon is required" });
  }

  console.log(req.file);

  const newCategory = new Category({
    name: req.body.name,
    icon: req.file.filename,
  });

  await newCategory.save();

  res.status(201).json({
    message: "category added succesfully",
    category: newCategory,
  });
});

router.get("/", async (req, res) => {
  const categories = await Category.find().select("-__v");
  res.json(categories);
});

module.exports = router;
