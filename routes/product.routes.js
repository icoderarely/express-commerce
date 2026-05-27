const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");
const authMiddleware = require("../middleware/auth.middleware");
const checkRole = require("../middleware/checkRole.middleware");
const router = express.Router();
const Product = require("../models/product.model");
const Category = require("../models/category.model");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "upload/products");
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

router.post(
  "/",
  authMiddleware,
  checkRole("seller"),
  upload.array("images", 8),
  async (req, res) => {
    const { title, description, category, price, stock } = req.body;

    const images = req.files.map((image) => image.filename);

    if (images.length === 0) {
      return res.status(400).json({ message: "At least one img is required." });
    }

    const newProduct = new Product({
      title,
      description,
      category,
      price,
      stock,
      images,
      seller: req.user._id,
    });

    await newProduct.save();

    res.status(201).json(newProduct);
  },
);

router.get("/", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const perPage = Number(req.query.perPage) || 8;

  const queryCategory = req.query.category || null;
  const querySearch = req.query.search || null;

  let query = {};

  if (queryCategory) {
    const category = await Category.findOne({ name: queryCategory });

    if (!category) {
      return res.status(404).json({ message: "Category not found!" });
    }

    query.category = category._id;
  }

  if (querySearch) {
    query.title = { $regex: querySearch, $options: "i" };
  }

  const products = await Product.find(query)
    .select("-description -seller -category -__v")
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean();

  const updatedProducts = products.map((product) => {
    const numberOfReviews = product.reviews.length;
    const sumOfRatings = product.reviews.reduce(
      (sum, review) => sum + review.rating,
      0,
    );
    const averageRating = sumOfRatings / (numberOfReviews || 1);

    return {
      ...product,
      images: product.images[0],
      reviews: { numberOfReviews, averageRating },
    };
  });

  const totalProducts = await Product.countDocuments(query);
  const totalPages = Math.ceil(totalProducts / perPage);

  res.json({
    products: updatedProducts,
    totalProducts,
    totalPages,
    currentPage: page,
    postPerPage: perPage,
  });
});

router.get("/suggestions", async (req, res) => {
  const search = req.query.search;
  const products = await Product.find({
    title: { $regex: search, $options: "i" },
  })
    .select("_id title")
    .limit(10);

  res.json(products);
});

router.get("/:id", async (req, res) => {
  const productId = req.params.id;

  const product = await Product.findById(productId)
    .populate("seller", "_id name email")
    .populate("reviews.user", "_id email name")
    .select("-category -__v");

  if (!product) {
    return res.status(404).json({ message: "Product not found!" });
  }

  res.json(product);
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const productId = req.params.id;

  const product = await Product.findById(productId).select("seller images");

  if (!product) {
    return res.status(404).json({ message: "Product not found!" });
  }

  if (
    req.user.role === "admin" ||
    req.user._id.toString() === product.seller.toString()
  ) {
    // WARN: commented only for testing
    // await product.deleteOne()

    // if (product.images && product.images.length > 0) {
    //   product.images.forEach(async (image) => {
    //     const fullPath = path.join(__dirname, "../upload/products", image);

    //     try {
    //       await fs.unlink(fullPath);
    //     } catch (error) {
    //       console.log(`Error deleting file: ${fullPath}`, error);
    //     }
    //   });
    // }

    return res.json({ message: "Product deleted successfully!" });
  }

  return res.status(403).json({
    message: "Access denier: Only admin or seller can delete this product!",
  });
});

module.exports = router;
