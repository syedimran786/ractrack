const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const ApiError = require("../utils/ApiError");

/* MEMORY STORAGE (for cloud upload) */
const storage = multer.memoryStorage();

/* ALLOWED TYPES */
const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp","application/octet-stream"];
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp",".jfif"];

/* FILE FILTER */
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

/* MULTER INSTANCE */
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

/* CALCULATE RAW HASH */
const calculateHash = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

/* MULTI-FILE UPLOAD */
const multiFileUpload = (fields) => {
  const uploader = upload.fields(fields);
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err instanceof multer.MulterError || err) return next(new ApiError(400, err.message));
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
