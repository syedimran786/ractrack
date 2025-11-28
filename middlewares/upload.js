const multer = require("multer");
const path = require("path");

// Memory storage
const storage = multer.memoryStorage();

// Acceptable MIME types
const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/pjpeg",
  "image/jfif",
];

// Acceptable file extensions
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".jfif"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

// ✅ Increase file size limit (e.g., 10MB)
module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
