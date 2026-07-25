import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "library/misc";
    let resource_type = "image";
    let allowed_formats = ["jpg", "jpeg", "png", "webp"];

    if (file.fieldname === "cover_image") {
      folder = "library/covers";
    } else if (file.fieldname === "book_file") {
      folder = "library/books";
      resource_type = "raw";
      allowed_formats = ["pdf"];
    } else if (file.fieldname === "profile_image") {
      folder = "library/profiles";
    }

    return { folder, resource_type, allowed_formats };
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});