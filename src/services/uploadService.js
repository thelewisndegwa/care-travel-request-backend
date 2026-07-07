const { v2: cloudinary } = require("cloudinary");
const env = require("../config/env");
const HttpError = require("../utils/httpError");

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
});

function ensureUploadConfigured() {
  if (
    !env.cloudinaryCloudName ||
    !env.cloudinaryApiKey ||
    !env.cloudinaryApiSecret
  ) {
    throw new HttpError(
      503,
      "Receipt upload is not configured. Set Cloudinary credentials to enable this endpoint."
    );
  }
}

async function uploadReceiptBuffer(file) {
  ensureUploadConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "care-travel-request/receipts",
        resource_type: "auto",
        public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      },
      (error, result) => {
        if (error) {
          return reject(
            new HttpError(502, "Receipt upload failed", { providerError: error.message })
          );
        }

        return resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}

module.exports = {
  uploadReceiptBuffer,
};
