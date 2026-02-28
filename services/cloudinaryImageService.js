const sharp = require("sharp");
const crypto = require("crypto");
const cloudinary = require("../config/cloudinary");


/* UPLOAD TO CLOUDINARY */
const uploadToCloudinary = async (buffer, folder = "companies") => {
  return await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: "image" }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      })
      .end(buffer);
  });
};

/* DELETE FROM CLOUDINARY */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};


/* PROCESS IMAGE + VALIDATE + GENERATE HASH *///! Detects duplicate images
const processImageAndGenerateHash = async (buffer) => {
  let processedBuffer;

  try {
    // 1️⃣ Validate image (if not real image, sharp throws error)
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.format) {
      throw new Error("Invalid image file");
    }

    // 2️⃣ Resize + optimize
    processedBuffer = await image
      .resize({
        width: 800,
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

  } catch (error) {
    throw new Error("Uploaded file is not a valid image");
  }

  // 3️⃣ Generate hash from optimized image
  const hash = crypto
    .createHash("sha256")
    .update(processedBuffer)
    .digest("hex");

  return { processedBuffer, hash };
};


module.exports = { uploadToCloudinary, deleteFromCloudinary ,processImageAndGenerateHash};
