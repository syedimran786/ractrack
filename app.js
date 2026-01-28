const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");

const errorHandler = require("./middlewares/errorHandler");

// Import module routes
const batchRoutes = require("./routes/batch.routes");
const trainerRoutes = require("./routes/trainer.routes");
const placementRoutes = require("./routes/placement.routes");
const companyRoutes = require("./routes/company.routes");
const enquiryRoutes = require("./routes/enquiry.routes");


const app = express();

// ------------------------------------
// 1. CORS (Production + Development)
// ------------------------------------
const allowedOrigins = [
  "http://localhost:5173",   // React local
  "http://localhost:3000",
  "https://your-production-domain.com"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow mobile apps / postman (no origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

// ------------------------------------
// 2. Security Headers
// ------------------------------------
app.use(helmet());

// ------------------------------------
// 3. Rate Limiting (Protect API from Abuse)
// ------------------------------------
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                 // limit per IP
  message: "Too many requests, please try again later."
}));

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


app.use("/api/batches", batchRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/placements", placementRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/enquiries", enquiryRoutes);


// ------------------------------------
// 8. Global Error Handler
// ------------------------------------
app.use(errorHandler);

module.exports = app;
