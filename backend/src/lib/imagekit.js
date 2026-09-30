import ImageKit, { toFile } from "@imagekit/nodejs";

const imagekit = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY });

// helper function to check if imagekit key exists
function hasImageKitConfig() {
  return Boolean(process.env.IMAGEKIT_PRIVATE_KEY);
}

// handles the duplicate file name issue
function createFileName(originalName = "upload") {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `chat-${Date.now()}-${safeName}`; // default file name format: chat-timestamp-safeName
}

/**
 * Upload image or video to ImageKit
 * @see https://imagekit.io/docs/api-reference/upload-file/upload-file
 */

async function uploadChatMedia(file) {
  const fileName = createFileName(file.originalname);
  const result = await imagekit.files.upload({
    file: await toFile(file.buffer, fileName, { type: file.mimetype }), // convert buffer to file
    fileName,
    folder: "/chat",
  });

  return result.url;
}

export { uploadChatMedia, hasImageKitConfig };
