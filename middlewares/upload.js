const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const ApiError = require("../utils/ApiError");

/* =====================================================
   MEMORY STORAGE (best for cloud uploads)
===================================================== */
const storage = multer.memoryStorage();

/* =====================================================
   ALLOWED FILE TYPES
===================================================== */
const allowedMimeTypes = [
  "image/jpeg",
  "image/pjpeg",
  "image/jpg",      // <-- Added
  "image/png",
  "image/webp",
  "application/octet-stream",
];

const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".jfif"];

/* =====================================================
   FILE FILTER
===================================================== */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new ApiError(400, `Invalid MIME type: ${file.mimetype}`), false);
  }

  if (!allowedExtensions.includes(ext)) {
    return cb(new ApiError(400, `Invalid file extension: ${ext}`), false);
  }

  cb(null, true);
};

/* =====================================================
   LIMITS
===================================================== */
const limits = {
  fileSize: 10 * 1024 * 1024, // 10 MB
};

/* =====================================================
   MULTER INSTANCE
===================================================== */
const upload = multer({ storage, fileFilter, limits });

/* =====================================================
   CALCULATE HASH (DETECT DUPLICATE IMAGE)
===================================================== */
const calculateHash = (buffer) => {
  return crypto.createHash("sha256").update(buffer).digest("hex");
};

/* =====================================================
   MULTI-FILE UPLOAD MIDDLEWARE
   + Adds `fileHash` for duplicate detection
===================================================== */
const multiFileUpload = (fields) => {
  const uploader = upload.fields(fields);

  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return next(new ApiError(400, err.message));
      } else if (err) {
        return next(new ApiError(400, err.message));
      }

      // Attach SHA-256 hash for duplicate detection
      if (req.files) {
        Object.keys(req.files).forEach((field) => {
          req.files[field].forEach((file) => {
            file.fileHash = calculateHash(file.buffer);
          });
        });
      }

      next();
    });
  };
};

module.exports = { upload, multiFileUpload, calculateHash };
