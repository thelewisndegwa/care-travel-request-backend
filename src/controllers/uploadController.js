const multer = require("multer");
const { uploadReceiptBuffer } = require("../services/uploadService");

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only PDF, JPG, PNG, and WEBP receipts are allowed")
      );
    }

    return callback(null, true);
  },
});

async function uploadReceipt(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "A receipt file is required" });
  }

  const uploaded = await uploadReceiptBuffer(req.file);

  return res.status(201).json({
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    originalName: req.file.originalname,
    bytes: uploaded.bytes,
    format: uploaded.format,
    resourceType: uploaded.resource_type,
  });
}

module.exports = {
  receiptUpload,
  uploadReceipt,
};
