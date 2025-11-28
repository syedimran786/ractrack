const cloudinary = require("../config/cloudinary");

const uploadImage = async (filePath, folder = "general") => {
  try {
    const uploaded = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "image",
      quality: "auto:good",
      fetch_format: "auto",
      transformation: [{ width: 1000, crop: "limit" }],
    });

    return {
      secure_url: uploaded.secure_url,
      public_id: uploaded.public_id,
    };
  } catch (err) {
    console.log("Cloudinary Upload Error:", err);
    throw new Error("Image upload failed");
  }
};

const deleteImage = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.log("Cloudinary Delete Error:", err);
    throw new Error("Failed to delete image");
  }
};

module.exports = { uploadImage, deleteImage };
