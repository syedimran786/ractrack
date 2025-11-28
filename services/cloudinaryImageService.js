const cloudinary = require("../config/cloudinary");
const sharp = require("sharp");

const uploadImageService = async (buffer, folder = "general") => {
  // Correct orientation & compress
  const compressedBuffer = await sharp(buffer)
    .rotate() // <-- fixes orientation automatically
    .resize(1000) // optional width limit
    .jpeg({ quality: 80 }) // compress
    .toBuffer();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: "jpg",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    stream.end(compressedBuffer);
  });
};

const deleteImageService = async (publicId) => {
  if (!publicId) return;
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

module.exports = {
  uploadImageService,
  deleteImageService,
};
