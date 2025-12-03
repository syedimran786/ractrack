const crypto = require("crypto");
const sharp = require("sharp");

const optimizeImage = async (buffer) => {
  const optimizedBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 1000, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  return optimizedBuffer;
};

module.exports = { optimizeImage };
