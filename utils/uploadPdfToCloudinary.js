const cloudinary = require("cloudinary").v2;

const uploadPdfToCloudinary = async (
  filePath
) => {
  return await cloudinary.uploader.upload(
    filePath,
    {
      resource_type: "raw",
      folder: "student-management/receipts",
    }
  );
};

module.exports = uploadPdfToCloudinary;