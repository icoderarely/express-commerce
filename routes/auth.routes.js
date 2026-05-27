const express = require("express");
const passport = require("passport");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/user.model");

router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:5173/login",
  }),
  async (req, res) => {
    // check user available or not using googleId or email
    const profile = req.user;
    let user = User.findOne({
      $or: [{ googleId: profile.id }, { email: profile.emails[0].value }],
    });

    if (user) {
      // user is available - upate google id & generate token and send it in response
      if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }
    } else {
      // user not availabe - create new user & generate token and send it in resp
      user = new User({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
      });

      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens({
      _id: user._id,
      name: user.name,
      role: user.role,
    });

    const newHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = newHashedRefreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // TODO: Change this to true for prod
      sameSite: "none",
      // domain: 'api.backend.com',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.redirect(`http://localhost:5173/dashboard?token=${accessToken}`);
  },
);

router.post("/refresh", async (req, res) => {
  const userRefreshToken = req.cookies.refreshToken;
  if (!userRefreshToken) {
    return res.status(401).json({ message: "no refresh token provided" });
  }
  let decodedUser;
  try {
    decodedUser = jwt.verify(userRefreshToken, process.env.REFRESH_TOKEN_KEY);
  } catch (err) {
    return res.status(403).json({ message: "invalid refresh token" });
  }

  const user = await User.findById(decodedUser._id);
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  const isValid = await bcrypt.compare(userRefreshToken, user.refreshToken);
  if (!isValid) {
    return res.status(403).json({ message: "refresh token is not valid" });
  }

  const { accessToken, refreshToken } = generateTokens({
    _id: user._id,
    name: user.name,
    role: user.role,
  });

  const newHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  user.refreshToken = newHashedRefreshToken;
  await user.save();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false, // TODO: Change this to true for prod
    sameSite: "none",
    // domain: 'api.backend.com',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json(accessToken);
});

router.post("/logout", async (req, res) => {
  const userRefreshToken = req.cookies.refreshToken;
  if (!userRefreshToken) {
    return res.status(401).json({ message: "no refresh token provided" });
  }
  let decodedUser;
  try {
    decodedUser = jwt.verify(userRefreshToken, process.env.REFRESH_TOKEN_KEY);
  } catch (err) {
    return res.status(403).json({ message: "invalid refresh token" });
  }

  const user = await User.findById(decodedUser._id);
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  user.refreshToken = null;
  await user.save();

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: false, // TODO: Change this to true for prod
    sameSite: "none",
    // domain: 'api.backend.com',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({ message: "logged out successfully" });
});

const generateTokens = (data) => {
  const accessToken = jwt.sign(data, process.env.ACCESS_TOKEN_KEY, {
    expiresIn: "1d", // INFO: in production change this to "5m"
  });
  const refreshToken = jwt.sign(
    { _id: data._id },
    process.env.REFRESH_TOKEN_KEY,
    {
      expiresIn: "7d",
    },
  );

  return { accessToken, refreshToken };
};

module.exports = router;
