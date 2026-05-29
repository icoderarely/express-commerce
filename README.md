# E-Commerce API

Production-style Node.js/Express backend for an e-commerce platform with role-based access control, JWT auth, Google OAuth, cart/order flow, file uploads, and Razorpay payments.

## Highlights

- Role-aware API: user, seller, admin
- JWT access tokens + refresh tokens stored in httpOnly cookies
- Google OAuth 2.0 login via Passport
- Razorpay checkout + signature verification
- Image upload pipeline (category icons, product images)
- Centralized logging with Winston + MongoDB transport

## Tech Stack

- Node.js, Express
- MongoDB + Mongoose
- JWT (access + refresh)
- Passport Google OAuth 2.0
- Razorpay
- Multer for uploads
- Winston logging (console, file, MongoDB)

## Project Structure

- `routes/` API routes
- `models/` Mongoose models
- `middleware/` auth + role checks
- `config/` app configuration (Passport strategy)
- `upload/` file uploads (served as static assets)
- `logs/` error logs

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Environment variables

Create a `.env` file at the project root.

```bash
PORT=3000
ACCESS_TOKEN_KEY=your_access_token_secret
REFRESH_TOKEN_KEY=your_refresh_token_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key
```

### 3) Start MongoDB

This project connects to `mongodb://localhost:27017/learn-ecommerce` by default. Ensure MongoDB is running locally, or update the connection string in [index.js](index.js) if you want to use a remote database.

### 4) Run the server

```bash
node index.js
```

If you use nodemon:

```bash
nodemon index.js
```

## Authentication and Authorization

### Access tokens

- Access tokens are JWTs returned from `/api/user/register` and `/api/user/login`.
- Send the access token in the `Authorization` header as `Bearer <token>`.

### Refresh tokens

- Refresh tokens are issued alongside access tokens and stored in an httpOnly cookie named `refreshToken`.
- Use `/api/auth/refresh` to rotate tokens. This invalidates the previous refresh token.

### Google OAuth

- Google OAuth uses Passport (`config/passport.js`).
- Flow:
  1.  Frontend hits `/api/auth/google`.
  2.  Google redirects to `/api/auth/google/callback`.
  3.  Server creates or updates user, issues tokens, sets refresh cookie, and redirects back to the frontend with `token` in the query string.

### Roles

Defined in the user model:

- `user` (default)
- `seller`
- `admin`

Role checks are enforced using the `checkRole` middleware for protected routes.

## Middlewares

- `auth.middleware.js`: Verifies JWT access token and attaches `req.user`.
- `checkRole.middleware.js`: Role-based authorization guard.
- `multer`: Handles product/category image uploads with size/type validation.
- Error middleware: Centralized error handling with structured logs.

## Razorpay Payments

Flow:

1. Client calls `/api/order/checkout` to create a Razorpay order.
2. Client opens Razorpay Checkout using the returned `orderId`.
3. On success, client calls `/api/order/paymentVerify` with the Razorpay signature.
4. Server verifies the signature, creates the order, and clears the cart.

The HTML test harness is available at [razorpay.html](razorpay.html) for local integration testing.

## Static File Hosting

- Category icons: `/upload/category/<filename>`
- Product images: `/upload/products/<filename>`

Files are stored under `upload/` and served as static assets by Express.

## API Overview

### Auth and User

- `POST /api/user/register` Register user with email/password
- `POST /api/user/login` Login user
- `GET /api/user` Get current user (auth required)
- `GET /api/auth/google` Start Google OAuth
- `GET /api/auth/google/callback` Google OAuth callback
- `POST /api/auth/refresh` Rotate refresh/access tokens
- `POST /api/auth/logout` Clear refresh token

### Categories

- `POST /api/category` Create category (admin, image upload)
- `GET /api/category` List categories

### Products

- `POST /api/products` Create product (seller, image upload)
- `GET /api/products` List products (pagination, filters)
- `GET /api/products/suggestions` Search suggestions
- `GET /api/products/:id` Product details
- `DELETE /api/products/:id` Delete product (admin or seller owner)

### Cart

- `POST /api/cart/:productId` Add product to cart
- `GET /api/cart` Get cart
- `PATCH /api/cart/increase/:productId` Increase quantity
- `PATCH /api/cart/decrease/:productId` Decrease quantity
- `PATCH /api/cart/remove/:productId` Remove product

### Orders

- `POST /api/order/checkout` Create Razorpay order
- `POST /api/order/paymentVerify` Verify payment + place order
- `GET /api/order` Get current user orders
- `PATCH /api/order/status/:orderId` Update order status (admin)

## Logging and Error Handling

- Winston logger logs to console, `logs/errors.log`, and MongoDB.
- Unhandled exceptions and promise rejections are captured and logged.
- Central error middleware returns a safe 500 response for unexpected errors.

## Notes for Production

- Set `secure: true` for cookies in production.
- Shorten access token TTL and enable HTTPS.
- Use a production-ready MongoDB connection string.

## License

ISC
