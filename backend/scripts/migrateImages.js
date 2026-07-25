import { v2 as cloudinary } from "cloudinary";
import pool from "../db/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function migrateImages() {
  console.log("🚀 Starting image migration...");

  // Get all books with local cover images
  const [books] = await pool.query(
    `SELECT id, title, cover_image FROM books 
     WHERE cover_image IS NOT NULL 
     AND cover_image NOT LIKE 'http%'`
  );

  console.log(`📚 Found ${books.length} books with local images`);

  let success = 0;
  let failed = 0;

  for (const book of books) {
    try {
      // Build local file path
      const localPath = path.join(
        __dirname,
        "../public",
        book.cover_image
      );

      if (!fs.existsSync(localPath)) {
        console.log(`⚠️  File not found for: ${book.title} — ${localPath}`);
        failed++;
        continue;
      }

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(localPath, {
        folder: "library/covers",
        resource_type: "image",
      });

      // Update database with new Cloudinary URL
      await pool.query(
        `UPDATE books SET cover_image = ? WHERE id = ?`,
        [result.secure_url, book.id]
      );

      console.log(`✅ Migrated: ${book.title}`);
      success++;

    } catch (err) {
      console.log(`❌ Failed: ${book.title} — ${err.message}`);
      failed++;
    }
  }

  // Also migrate profile images
  const [users] = await pool.query(
    `SELECT id, full_name, profile_image FROM users
     WHERE profile_image IS NOT NULL
     AND profile_image NOT LIKE 'http%'`
  );

  console.log(`\n👥 Found ${users.length} users with local profile images`);

  for (const user of users) {
    try {
      const localPath = path.join(
        __dirname,
        "../../public",
        user.profile_image
      );

      if (!fs.existsSync(localPath)) {
        console.log(`⚠️  File not found for user: ${user.full_name}`);
        failed++;
        continue;
      }

      const result = await cloudinary.uploader.upload(localPath, {
        folder: "library/profiles",
        resource_type: "image",
      });

      await pool.query(
        `UPDATE users SET profile_image = ? WHERE id = ?`,
        [result.secure_url, user.id]
      );

      console.log(`✅ Migrated profile: ${user.full_name}`);
      success++;

    } catch (err) {
      console.log(`❌ Failed profile: ${user.full_name} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 Done! Success: ${success}, Failed: ${failed}`);
  process.exit(0);
}

migrateImages().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});