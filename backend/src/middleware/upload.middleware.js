import multer from "multer";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function createUpload(allowedPrefixes, errorMessage) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      const allowed = allowedPrefixes.some((prefix) =>
        file.mimetype.startsWith(prefix),
      );
      if (allowed) cb(null, true);
      else cb(Object.assign(new Error(errorMessage), { status: 400 })); // picked up by the error handler in index.js
    },
  });
}

// chat attachments: photos, videos, audio files and recorded voice notes
export const upload = createUpload(
  ["image/", "video/", "audio/"],
  "Only image, video and audio files are allowed",
);

// custom chat backgrounds
export const uploadImage = createUpload(["image/"], "Only images are allowed");
