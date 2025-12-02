const cloudinary = require("../config/cloudinary");
const sharp = require("sharp");

/* =====================================================
   UTIL: COMPRESS + RESIZE + AUTO-ORIENT
===================================================== */
const compressImage = async (buffer) => {
  // Detect metadata (width, height)
  const meta = await sharp(buffer).metadata();

  // Resize only if image is larger than 1200px (prevents upscaling)
  const resizeOptions = meta.width > 1200 ? { width: 1200 } : {};

  return sharp(buffer)
    .rotate() // auto-orientation
    .resize(resizeOptions) // only resize when needed
    .webp({ quality: 85 }) // convert to WebP (best balance)
    .toBuffer();
};

/* =====================================================
   UPLOAD IMAGE
   Smart optimization + better error handling
===================================================== */
const uploadImageService = async (buffer, folder = "general") => {
  try {
    const optimizedBuffer = await compressImage(buffer);

    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          format: "webp", // enforce WebP output
        },
        (error, result) => {
          if (error) return reject(error);

          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
          });
        }
      );

      stream.end(optimizedBuffer);
    });
  } catch (err) {
    throw new Error("Cloudinary upload failed: " + err.message);
  }
};

/* =====================================================
   DELETE IMAGE (safe destroy)
===================================================== */
const deleteImageService = async (publicId) => {
  if (!publicId) return;

  try {
    return await new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  } catch (err) {
    throw new Error("Cloudinary deletion failed: " + err.message);
  }
};

module.exports = {
  uploadImageService,
  deleteImageService,
};
