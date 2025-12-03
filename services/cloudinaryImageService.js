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

module.exports = { uploadToCloudinary, deleteFromCloudinary };
