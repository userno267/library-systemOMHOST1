import db from "../db/db.js";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { toPublicPath } from "../middleware/upload.js";

/* ===========================
   ADD BOOK WITH QR (ID BASED)
=========================== */


export const bulkDeleteBooks = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No IDs provided" });
    }

    await db.query(
      `DELETE FROM books WHERE id IN (?)`,
      [ids]
    );

    res.json({
      success: true,
      deleted: ids.length
    });

  } catch (err) {
    console.error("BULK DELETE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const addBook = async (req, res) => {
  try {
    const {
      title,
      author,
      description,
      type,
      copies = 0,
      isbn,
      publisher,
      copyright_date,
      place_of_publication,
      volume,
      call_number,
      section,
      subjects = "",
    } = req.body;

    const bookFile = req.files?.book_file?.[0];
    const coverImage = req.files?.cover_image?.[0];

    const filePath = bookFile ? toPublicPath(bookFile) : null;
    const coverPath = coverImage ? toPublicPath(coverImage) : null;

    const finalCopies =
      type === "digital" ? 0 : Number(copies || 0);

    const status =
      type === "digital" || finalCopies > 0
        ? "available"
        : "unavailable";

    /* ---------- INSERT BOOK FIRST ---------- */
    const [result] = await db.query(
      `INSERT INTO books
      (title, author, description, type, status, copies,
       isbn, publisher, copyright_date,
       place_of_publication, volume,
       call_number, section,
       file_path, cover_image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        author,
        description,
        type,
        status,
        finalCopies,
        isbn,
        publisher,
        copyright_date,
        place_of_publication,
        volume,
        call_number,
        section,
        filePath,
        coverPath,
      ]
    );

    const bookId = result.insertId;

    /* ---------- GENERATE QR TEXT ---------- */
    // Network-independent content
    const qrContent = `BOOK:${bookId}`;

    /* ---------- CONVERT TO BASE64 IMAGE ---------- */
    const qrCodeBase64 = await QRCode.toDataURL(qrContent, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 300,
    });

    /* ---------- SAVE QR STRING ---------- */
    await db.query(
      "UPDATE books SET qr_code_text=? WHERE id=?",
      [qrCodeBase64, bookId]
    );

    /* ---------- SUBJECTS PIVOT ---------- */
    const subjectList = subjects
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const s of subjectList) {
      const [existing] = await db.query(
        "SELECT id FROM subjects WHERE name=?",
        [s]
      );

      const subjectId = existing.length
        ? existing[0].id
        : (
            await db.query(
              "INSERT INTO subjects (name) VALUES (?)",
              [s]
            )
          )[0].insertId;

      await db.query(
        "INSERT INTO book_subjects (book_id, subject_id) VALUES (?, ?)",
        [bookId, subjectId]
      );
    }

    /* ---------- SOCKET EVENT ---------- */
    req.app.get("io").emit("booksUpdated");

    /* ---------- RETURN QR TO ADMIN ---------- */
  res.json({
  success: true,
  bookId,
  qrCodeText: qrCodeBase64,
});


  } catch (err) {
    console.error("ADD BOOK ERROR:", err);
    res.status(500).json({
      message: "Failed to add book",
    });
  }
};
/* ===========================
   GET BOOKS (FIXED)
=========================== */
export const getBooks = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const offset = (page - 1) * limit;

    let where = "WHERE 1=1";
    const params = [];

    if (search) {
      where += " AND (title LIKE ? OR author LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      where += " AND status = ?";
      params.push(status);
    }

    const [[count]] = await db.query(
      `SELECT COUNT(*) AS total FROM books ${where}`,
      params
    );

    const totalPages = Math.max(
      1,
      Math.ceil(count.total / limit)
    );

    const [books] = await db.query(
      `
      SELECT
        id,
        title,
        author,
        type,
        status,
        section,
        copies,
        cover_image,
        file_path,
        created_at
      FROM books
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    res.json({ books, totalPages });
  } catch (err) {
    console.error("GET BOOKS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch books" });
  }
};


export const getPBooks = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = (req.query.search || "").trim();
    const status = req.query.status || "";
    const offset = (page - 1) * limit;

    // Base WHERE clause: only physical books
    let where = "WHERE type != 'digital'";
    const params = [];

    // Search filter
    if (search) {
      where += " AND (title LIKE ? OR author LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Status filter (optional)
    if (status) {
      where += " AND status = ?";
      params.push(status);
    }

    // Count total books
    const [[count]] = await db.query(
      `SELECT COUNT(*) AS total FROM books ${where}`,
      params
    );

    const totalPages = Math.max(1, Math.ceil(count.total / limit));

    // Fetch books with pagination
    const [books] = await db.query(
      `
      SELECT
        id,
        title,
        author,
        type,
        status,
        section,
        copies,
        cover_image,
        file_path,
        created_at
      FROM books
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    // Return response
    res.json({ books, totalPages, page, total: count.total });
  } catch (err) {
    console.error("GET BOOKS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch books" });
  }
};
/* ===========================
   GET EBOOKS (PAGINATED)
=========================== */
export const getEbooks = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 10);
    const search = (req.query.search || "").trim();
    const offset = (page - 1) * limit;

    let where = "WHERE type = 'digital'";
    const params = [];

    if (search) {
      where += " AND (title LIKE ? OR author LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    /* ===========================
       COUNT TOTAL
    =========================== */
    const [[count]] = await db.query(
      `SELECT COUNT(*) AS total FROM books ${where}`,
      params
    );

    const totalPages = Math.max(1, Math.ceil(count.total / limit));

    /* ===========================
       FETCH BOOKS
    =========================== */
    const [books] = await db.query(
      `
      SELECT
        id,
        title,
        author,
        cover_image,
        file_path
      FROM books
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    /* ===========================
       NORMALIZE PATHS (IMPORTANT)
    =========================== */
    const normalizedBooks = books.map((book) => ({
      ...book,
      cover_image: book.cover_image || null,
      file_path: book.file_path || null
    }));

    res
      .status(200)
      .set("Content-Type", "application/json")
      .json({
        books: normalizedBooks,
        totalPages,
        page,
        total: count.total
      });

  } catch (err) {
    console.error("GET EBOOKS ERROR:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch e-books" });
  }
};


/* ===========================
   GET BOOK BY ID
=========================== */
export const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const [books] = await db.query(
      `SELECT 
        id,
        title,
        author,
        description,
        type,
        copies,
        isbn,
        publisher,
        copyright_date,
        place_of_publication,
        volume,
        call_number,
        section,
        file_path,
        cover_image,
        qr_code_text
      FROM books 
      WHERE id = ?`,
      [id]
    );

    if (!books.length) {
      return res.status(404).json({ message: "Book not found" });
    }

    // ==============================
    // GET ONLY ACTIVE BORROW STATUS
    // ==============================
    let borrowStatus = null;

    if (userId) {
      const [borrow] = await db.query(
        `SELECT status 
         FROM borrows
         WHERE user_id = ? 
           AND book_id = ? 
           AND returned_at IS NULL
         ORDER BY id DESC
         LIMIT 1`,
        [userId, id]
      );

      if (borrow.length > 0) {
        borrowStatus = borrow[0].status;
      }
    }

    // ==============================
    // SUBJECTS
    // ==============================
    const [subjects] = await db.query(
      `SELECT s.id, s.name
       FROM book_subjects bs
       JOIN subjects s ON bs.subject_id = s.id
       WHERE bs.book_id = ?`,
      [id]
    );

    res.json({
      ...books[0],
      subjects,
      borrowStatus,
    });

  } catch (err) {
    console.error("GET BOOK ERROR:", err);
    res.status(500).json({ message: "Failed to fetch book" });
  }
};

/* ===========================
   UPDATE BOOK
=========================== */
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      author,
      description,
      type,
      copies,
      isbn,
      publisher,
      copyright_date,
      place_of_publication,
      volume,
      call_number,
      section,
    } = req.body;

    const subjects = req.body["subjects[]"] || [];

    const bookFile = req.files?.book_file?.[0];
    const coverImage = req.files?.cover_image?.[0];

    const [existing] = await db.query(
      "SELECT file_path, cover_image FROM books WHERE id=?",
      [id]
    );

    if (!existing.length)
      return res.status(404).json({ message: "Book not found" });

    const finalCopies =
      type === "digital" ? 0 : Number(copies || 0);

    const status =
      type === "digital" || finalCopies > 0
        ? "available"
        : "unavailable";

    const filePath = bookFile ? toPublicPath(bookFile) : existing[0].file_path;
    const coverPath = coverImage ? toPublicPath(coverImage) : existing[0].cover_image;

    await db.query(
      `UPDATE books SET
       title=?, author=?, description=?,
       type=?, status=?, copies=?,
       isbn=?, publisher=?, copyright_date=?,
       place_of_publication=?, volume=?,
       call_number=?, section=?,
       file_path=?, cover_image=?
       WHERE id=?`,
      [
        title,
        author,
        description,
        type,
        status,
        finalCopies,
        isbn,
        publisher,
        copyright_date,
        place_of_publication,
        volume,
        call_number,
        section,
        filePath,
        coverPath,
        id,
      ]
    );

    /* ---------- Update Subjects ---------- */
    await db.query(
      "DELETE FROM book_subjects WHERE book_id=?",
      [id]
    );

    for (const s of [].concat(subjects)) {
      await db.query(
        "INSERT INTO book_subjects (book_id, subject_id) VALUES (?, ?)",
        [id, s]
      );
    }

    req.app.get("io").emit("booksUpdated");

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE BOOK ERROR:", err);
    res.status(500).json({ message: "Failed to update book" });
  }
};

/* ===========================
   DELETE BOOK
=========================== */
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      "DELETE FROM books WHERE id=?",
      [id]
    );

    req.app.get("io").emit("booksUpdated");

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE BOOK ERROR:", err);
    res.status(500).json({ message: "Failed to delete book" });
  }
};
/* ===========================
   GET SECTIONS
=========================== */
export const getSections = async (req, res) => {
  try {
    const search = req.query.q || "";

    const [rows] = await db.query(
      `
      SELECT DISTINCT section
      FROM books
      WHERE section IS NOT NULL
        AND section != ''
        AND section LIKE ?
      ORDER BY section
      LIMIT 10
      `,
      [`%${search}%`]
    );

    res.json(rows.map(r => r.section));
  } catch (err) {
    console.error("GET SECTIONS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch sections" });
  }
};
/* ===========================
   GET SUBJECTS (SEARCH)
=========================== */
export const getSubjects = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    if (!q) {
      return res.json([]);
    }

    const [rows] = await db.query(
      `
      SELECT name
      FROM subjects
      WHERE name LIKE ?
      ORDER BY name
      LIMIT 10
      `,
      [`%${q}%`]
    );

    res.json(
      rows.map((row) => ({
        label: row.name,
        value: row.name,
      }))
    );
  } catch (err) {
    console.error("GET SUBJECTS ERROR:", err);
    res.status(500).json([]);
  }
};
export const printQRCodes = async (req, res) => {
  try {
    const {
      paper = { width: 595, height: 842 }, // A4
      sticker = { height: 144, margin: 10 }, // width is now calculated
      columns = 4,                           // stickers per row
      pageMargin = 18,                       // outer page margin (~0.25")
      includeCutGuides = true,
      books = []
    } = req.body;

    if (!books.length) {
      return res.status(400).json({ message: "No books selected" });
    }

    // ===== LAYOUT (validate BEFORE creating/piping the PDF) =====
    const gap = sticker.margin;
    const usableWidth = paper.width - pageMargin * 2;
    const usableHeight = paper.height - pageMargin * 2;

    // Width is derived so exactly `columns` fit in one row
    const stickerWidth = (usableWidth - gap * (columns - 1)) / columns;
    const stickerHeight = sticker.height;

    const stickersPerRow = columns;
    const stickersPerCol = Math.floor(
      (usableHeight + gap) / (stickerHeight + gap)
    );
    const stickersPerPage = stickersPerRow * stickersPerCol;

    if (stickerWidth <= 0 || stickersPerPage <= 0) {
      return res.status(400).json({
        message: "Sticker size too large for selected paper"
      });
    }

    // QR size: square, fits inside the sticker and leaves room for text
    const textAreaHeight = 50;
    const qrSize = Math.min(stickerWidth - 16, stickerHeight - textAreaHeight - 8);

    // ===== CREATE PDF =====
    const doc = new PDFDocument({
      size: [paper.width, paper.height],
      margin: 0
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=qr-stickers.pdf");
    doc.pipe(res);

    let currentIndex = 0;

    for (const item of books) {
      const { bookId, copiesToPrint } = item;
      if (!copiesToPrint || copiesToPrint <= 0) continue;

      const [rows] = await db.query(
        `SELECT id, title, volume, call_number, qr_code_text
         FROM books
         WHERE id = ?`,
        [bookId]
      );
      if (!rows.length) continue;

      const book = rows[0];
      const title =
        book.title.length > 30 ? book.title.substring(0, 27) + "..." : book.title;

      let imgBuffer = null;
      if (book.qr_code_text) {
        const base64Data = book.qr_code_text.replace(/^data:image\/png;base64,/, "");
        imgBuffer = Buffer.from(base64Data, "base64");
      }

      for (let copy = 1; copy <= copiesToPrint; copy++) {
        if (currentIndex > 0 && currentIndex % stickersPerPage === 0) {
          doc.addPage({ size: [paper.width, paper.height], margin: 0 });
        }

        const position = currentIndex % stickersPerPage;
        const row = Math.floor(position / stickersPerRow);
        const col = position % stickersPerRow;

        const x = pageMargin + col * (stickerWidth + gap);
        const y = pageMargin + row * (stickerHeight + gap);

        // Cut guide
        if (includeCutGuides) {
          doc.lineWidth(0.5).rect(x, y, stickerWidth, stickerHeight).stroke();
        }

        // ===== QR IMAGE (centered) =====
        if (imgBuffer) {
          doc.image(imgBuffer, x + (stickerWidth - qrSize) / 2, y + 6, {
            fit: [qrSize, qrSize]
          });
        }

        // ===== TEXT =====
        const textOpts = {
          width: stickerWidth - 8,
          align: "center",
          lineBreak: false,
          ellipsis: true
        };
        let textY = y + 6 + qrSize + 4;

        doc.fontSize(7).text(title, x + 4, textY, textOpts);
        textY += 9;

        if (book.volume) {
          doc.fontSize(6.5).text(`Vol. ${book.volume}`, x + 4, textY, textOpts);
          textY += 8;
        }

        if (book.call_number) {
          doc.fontSize(6.5).text(book.call_number, x + 4, textY, textOpts);
          textY += 8;
        }

        doc.fontSize(6.5).text(`Copy ${copy} of ${copiesToPrint}`, x + 4, textY, textOpts);

        currentIndex++;
      }
    }

    doc.end();
  } catch (error) {
    console.error("PRINT QR ERROR:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate QR stickers" });
    }
  }
};