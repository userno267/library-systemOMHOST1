import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base uploads directory: backend/public/uploads
const UPLOAD_ROOT = path.join(__dirname, "..", "public", "uploads");

// Map each form field to its own subfolder
const FOLDER_MAP = {
  cover_image: "covers",
  book_file: "books",
  profile_image: "profiles",
};

// Ensure all target folders exist at startup
Object.values(FOLDER_MAP).forEach((folder) => {
  const dir = path.join(UPLOAD_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = FOLDER_MAP[file.fieldname] || "misc";
    const dir = path.join(UPLOAD_ROOT, folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED_IMAGE_TYPES = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_PDF_TYPES = [".pdf"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === "book_file") {
    if (!ALLOWED_PDF_TYPES.includes(ext)) {
      return cb(new Error("Only PDF files are allowed for book_file"));
    }
  } else {
    // cover_image, profile_image
    if (!ALLOWED_IMAGE_TYPES.includes(ext)) {
      return cb(new Error("Only jpg, jpeg, png, webp images are allowed"));
    }
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Helper: turn an absolute file path into the relative URL path
// your DB should store, e.g. "/uploads/covers/abcd1234.jpg"
export function toPublicPath(file) {
  if (!file) return null;
  const folder = FOLDER_MAP[file.fieldname] || "misc";
  return `/uploads/${folder}/${file.filename}`;
}