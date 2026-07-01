const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/errorHandler");

// Import module routes
const batchRoutes = require("./routes/batch.routes");
const trainerRoutes = require("./routes/trainer.routes");
const placementRoutes = require("./routes/placement.routes");
const studentRoutes = require("./routes/student.routes");
const companyRoutes = require("./routes/company.routes");
const enquiryRoutes = require("./routes/enquiry.routes");
const interviewRoutes = require("./routes/interview.routes");
const paymentRoutes = require("./routes/payment.routes");
const paymentTransactionRoutes = require("./routes/paymentTransaction.routes");
const userRoutes = require("./routes/user.routes");
const authRoutes = require("./routes/auth.routes");
const verifyJWT = require("./middlewares/auth.middleware");
const checkPasswordChange = require("./middlewares/checkPasswordChange.middleware");
const authorizeRoles = require("./middlewares/authorizeRoles.middleware");

const app = express();
app.use(cookieParser());
// ------------------------------------
// 1. CORS (Production + Development)
// ------------------------------------
const allowedOrigins = [
  "http://localhost:5173", // React local
  "http://localhost:3000",
  "https://your-production-domain.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow mobile apps / postman (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// ------------------------------------
// 2. Security Headers
// ------------------------------------
app.use(helmet());

// ------------------------------------
// 3. Rate Limiting (Protect API from Abuse)
// ------------------------------------
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // limit per IP
    message: "Too many requests, please try again later.",
  }),
);

// ------------------------------------
// 4. Prevent NoSQL Injection
// ------------------------------------
app.use(mongoSanitize());

// ------------------------------------
// 5. Prevent XSS Attacks
// ------------------------------------
app.use(xssClean());

// ------------------------------------
// 6. Other Middlewares
// ------------------------------------
app.use(express.json());
app.use(morgan("dev"));

// ------------------------------------
// 7. API Routes
// ------------------------------------

app.use(
  "/api/batches",
  verifyJWT,
  checkPasswordChange,
  authorizeRoles("super admin", "admin"),
  batchRoutes,
);
app.use("/api/trainers", verifyJWT, checkPasswordChange, trainerRoutes);
app.use("/api/students", verifyJWT, checkPasswordChange, studentRoutes);
app.use("/api/placements", verifyJWT, checkPasswordChange, placementRoutes);
app.use("/api/companies", companyRoutes);
app.use(
  "/api/enquiries",
  verifyJWT,
  checkPasswordChange,
  authorizeRoles("super admin", "admin", "counsellor"),
  enquiryRoutes,
);
app.use("/api/interviews", verifyJWT, checkPasswordChange, interviewRoutes);
app.use(
  "/api/payments",
  verifyJWT,
  checkPasswordChange,
  authorizeRoles("super admin", "admin", "fee collector"),
  paymentRoutes,
);
app.use(
  "/api/payment-transactions",
  verifyJWT,
  checkPasswordChange,
  authorizeRoles("super admin", "admin", "fee collector"),
  paymentTransactionRoutes,
);
app.use(
  "/api/user",
  verifyJWT,
  checkPasswordChange,
  authorizeRoles("super admin", "admin"),
  userRoutes,
);
app.use("/api/auth", authRoutes);

// ------------------------------------
// 8. Global Error Handler
// ------------------------------------
app.use(errorHandler);

module.exports = app;
