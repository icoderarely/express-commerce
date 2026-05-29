const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const authMiddleware = require("../middleware/auth.middleware");
const Cart = require("../models/cart.model");
const Order = require("../models/order.model");
const checkRole = require("../middleware/checkRole.middleware");
const { truncate } = require("fs");
const router = express.Router();

const fetchExchangeRate = async (baseCurrency, targetCurrency) => {
  if (baseCurrency === targetCurrency) {
    return 1;
  }

  const response = await fetch(
    `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/pair/${baseCurrency}/${targetCurrency}`,
  );

  if (!response.ok) {
    throw new Error(`Exchange rate request failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.result !== "success" || typeof data.conversion_rate !== "number") {
    throw new Error("Exchange rate response invalid");
  }

  return data.conversion_rate;
};

router.post("/checkout", authMiddleware, async (req, res) => {
  const { currency = "INR", shippingAddress } = req.body;
  if (!shippingAddress) {
    return res
      .status(400)
      .json({ message: "Please provide your delivery address!" });
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.products.length === 0) {
    return res.status(400).json({ message: "cart not found" });
  }

  const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  let exchangeRate = 1;

  try {
    exchangeRate = await fetchExchangeRate("INR", currency);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "Unable to fetch exchange rate",
    });
  }

  const amount = Math.round(cart.totalCartPrice * exchangeRate * 100);

  const order = await razorpayInstance.orders.create({
    amount: amount,
    currency: currency,
    receipt: `receipt_${Date.now()}`,
  });

  res.json({
    success: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
  });
});

router.post("/paymentVerify", authMiddleware, async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    shippingAddress,
  } = req.body;

  if (!shippingAddress) {
    return res
      .status(400)
      .json({ message: "Please provide your delivery address!" });
  }

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid payment signature" });
  }

  const cart = await Cart.findOne({ user: req.user._id });

  const newOrder = new Order({
    user: req.user._id,
    products: cart.products,
    totalProducts: cart.totalProducts,
    totalPrice: cart.totalCartPrice,
    shippingAddress: shippingAddress,
    paymentStatus: "paid",
    paymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
  });

  await newOrder.save();
  await cart.deleteOne();

  return res.json({
    success: true,
    message: "Payment verified successfully!",
  });
});

router.get("/", authMiddleware, async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .select("-user -shippingAddress -paymentId");

  res.json(orders);
});

router.patch(
  "/status/:orderId",
  authMiddleware,
  checkRole("admin"),
  async (req, res) => {
    const status = req.body.status;
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.orderId,
      { orderStatus: status },
      { new: true },
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found!" });
    }

    res.json({
      message: "Order status updated succesfully",
      updatedOrderStatus: updatedOrder.status,
    });
  },
);

module.exports = router;
