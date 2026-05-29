const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const Product = require("../models/product.model");
const Cart = require("../models/cart.model");
const router = express.Router();

router.post("/:productId", authMiddleware, async (req, res) => {
  const { quantity } = req.body;
  const productId = req.params.productId;
  const userId = req.user._id;

  if (!productId || !quantity) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(400).json({ message: "Product not found" });
  }

  // find users cart
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({
      user: userId,
      products: [],
      totalCartPrice: 0,
      totalProducts: 0,
    });
  }

  if (product.stock < quantity) {
    return res.status(400).json({ message: "Stock is not enough!" });
  }

  // check if product already in cart
  const existingProductIndex = cart.products.findIndex(
    (product) => product.productId.toString() === productId.toString(),
  );
  if (existingProductIndex !== -1) {
    if (
      cart.products[existingProductIndex].quantity + quantity >=
      product.stock
    ) {
      return res.status(400).json({ message: "Stock is not enough!" });
    }
    cart.products[existingProductIndex].quantity += quantity;
  } else {
    cart.products.push({
      productId,
      quantity,
      title: product.title,
      price: product.price,
      image: product.images[0],
    });
  }

  cart.totalProducts = cart.products.reduce((total, product) => {
    return total + product.quantity;
  }, 0);

  cart.totalCartPrice = cart.products.reduce((total, product) => {
    return total + product.price * product.quantity;
  }, 0);

  await cart.save();

  res
    .status(200)
    .json({ message: "Product added to cart successfully!", cart: cart });
});

router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user._id;
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    return res.status(404).json({ message: "Cart not found!" });
  }

  res.json(cart);
});

router.patch("/increase/:productId", authMiddleware, async (req, res) => {
  const productId = req.params.productId;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(400).json({ message: "Product not found" });
  }

  const userId = req.user._id;
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    return res.status(404).json({ message: "Cart not found!" });
  }

  const index = cart.products.findIndex(
    (product) => product.productId.toString() === productId.toString(),
  );

  if (index === -1) {
    return res.status(404).json({ message: "Product not found in cart!" });
  }

  if (cart.products[index].quantity === product.stock) {
    return res.status(400).json({ message: "Product ran out of stock..." });
  }

  cart.products[index].quantity += 1;

  cart.totalProducts += 1;
  cart.totalCartPrice += product.price;

  await cart.save();

  res.json({ message: "cart updated", cart: cart });
});

router.patch("/decrease/:productId", authMiddleware, async (req, res) => {
  const productId = req.params.productId;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(400).json({ message: "Product not found" });
  }

  const userId = req.user._id;
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    return res.status(404).json({ message: "Cart not found!" });
  }

  const index = cart.products.findIndex(
    (product) => product.productId.toString() === productId.toString(),
  );

  if (index === -1) {
    return res.status(404).json({ message: "Product not found in cart!" });
  }

  if (cart.products[index].quantity > 1) {
    cart.products[index].quantity -= 1;
  } else {
    cart.products.splice(index, 1);
  }

  cart.totalProducts -= 1;
  cart.totalCartPrice -= product.price;

  await cart.save();

  res.json({ message: "cart updated", cart: cart });
});

router.patch("/remove/:productId", authMiddleware, async (req, res) => {
  const productId = req.params.productId;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(400).json({ message: "Product not found" });
  }

  const userId = req.user._id;
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    return res.status(404).json({ message: "Cart not found!" });
  }

  const index = cart.products.findIndex(
    (product) => product.productId.toString() === productId.toString(),
  );

  if (index === -1) {
    return res.status(404).json({ message: "Product not found in cart!" });
  }

  if (
    cart.products.length === 1 &&
    cart.products[index].productId.toString() === productId.toString()
  ) {
    await Cart.findByIdAndDelete(cart._id);
    return res.json({ message: "product removed from cart succesfully" });
  }

  cart.totalProducts -= cart.products[index].quantity;
  cart.totalCartPrice -=
    cart.products[index].quantity * cart.products[index].price;

  cart.products.splice(index, 1);

  await cart.save();

  res.json({ message: "Product removed successfully!", cart: cart });
});

module.exports = router;
