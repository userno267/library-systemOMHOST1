import multer from "multer";
import path from "path";
import os from "os";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir()); // temp scratch space; bookBulkController.js deletes the extracted files + zip after processing
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, uniqueName + path.extname(file.originalname));
  }
});

export const uploadZip = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB ZIP
});