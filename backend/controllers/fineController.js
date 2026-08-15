import db from "../db/db.js";
import crypto from "crypto";

// Helper: send a notification without ever letting it fail the parent request.
// A notification hiccup (bad enum value, missing io, etc.) should never turn
// an already-committed fine action into a false 500 for the client.
async function sendNotification(req, { userId, title, message }) {
  try {
    const [notifResult] = await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, 'system')`,
      [userId, title, message]
    );

    const [rows] = await db.query(
      `SELECT * FROM notifications WHERE id = ?`,
      [notifResult.insertId]
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${userId}`).emit("newNotification", rows[0]);
    } else {
      console.error("sendNotification: io is undefined/null — socket not attached to app");
    }
  } catch (notifErr) {
    console.error("sendNotification failed (non-fatal):", notifErr.message);
  }
}

export const payMultipleFines = async (req, res) => {
  const { fineIds, amountPaid } = req.body;
  const processedBy = req.user.id;

  if (!Array.isArray(fineIds) || fineIds.length === 0) {
    return res.status(400).json({ message: "fineIds must be a non-empty array" });
  }

  try {
    const placeholders = fineIds.map(() => "?").join(",");
    const [rows] = await db.query(
      `SELECT * FROM fines WHERE id IN (${placeholders}) AND status = 'unpaid'`,
      fineIds
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "No unpaid fines found for given IDs" });
    }
    if (rows.length !== fineIds.length) {
      return res.status(400).json({ message: "Some fines are already resolved or do not exist" });
    }

    const userId = rows[0].user_id;
    const sameUser = rows.every((f) => f.user_id === userId);
    if (!sameUser) {
      return res.status(400).json({ message: "All fines must belong to the same user" });
    }

    const totalDue = rows.reduce((sum, f) => sum + Number(f.amount), 0);
    const paidAmount = Number(amountPaid) || totalDue;
    if (paidAmount < totalDue) {
      return res.status(400).json({ message: `Amount paid (₱${paidAmount}) is less than total due (₱${totalDue})` });
    }
    const changeAmount = Math.max(0, paidAmount - totalDue);

    const groupId = crypto.randomUUID();

    // store the FULL paid/change amount on the FIRST fine row only,
    // and just the face-value amount on the rest, so SUM(amount_paid) across
    // the group equals the actual amount the student handed over, and
    // SUM(change_amount) equals the actual change given — not duplicated per row.
    for (let i = 0; i < rows.length; i++) {
      const fine = rows[i];
      const isFirst = i === 0;

      await db.query(
        `UPDATE fines
         SET status = 'paid',
             paid_at = NOW(),
             processed_by = ?,
             amount_paid = ?,
             change_amount = ?,
             payment_group_id = ?
         WHERE id = ?`,
        [
          processedBy,
          isFirst ? paidAmount - (totalDue - fine.amount) : fine.amount,
          isFirst ? changeAmount : 0,
          groupId,
          fine.id,
        ]
      );
    }

    const [[{ totalUnpaid }]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalUnpaid
       FROM fines WHERE user_id = ? AND status = 'unpaid'`,
      [userId]
    );

    const message = `${rows.length} fines totaling ₱${totalDue.toFixed(2)} have been paid` +
      (changeAmount > 0 ? ` (paid ₱${paidAmount.toFixed(2)}, change: ₱${changeAmount.toFixed(2)}).` : ".") +
      (totalUnpaid > 0 ? ` You still have ₱${totalUnpaid} in unpaid fines.` : " You can now borrow books again.");

    // Fine payment is already committed at this point — notification is best-effort.
    await sendNotification(req, {
      userId,
      title: "Fines Paid — Receipt Available",
      message,
    });

    res.json({
      message: "Fines paid successfully",
      groupId,
      totalDue,
      paidAmount,
      changeAmount,
      totalUnpaid,
      fineIds: rows.map((f) => f.id),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to pay fines" });
  }
};

export const getGroupReceiptData = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const [fines] = await db.query(
      `SELECT f.*,
        bk.title AS book_title,
        b.due_date,
        b.borrowed_at,
        b.returned_at,
        u.full_name AS student_name,
        u.lrn AS student_lrn,
        u.email AS student_email,
        p.full_name AS processed_by_name
       FROM fines f
       LEFT JOIN borrows b ON f.borrow_id = b.id
       LEFT JOIN books bk ON b.book_id = bk.id
       JOIN users u ON f.user_id = u.id
       LEFT JOIN users p ON f.processed_by = p.id
       WHERE f.payment_group_id = ?
       ORDER BY f.id`,
      [groupId]
    );

    if (!fines.length) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (role === "student" && fines[0].user_id !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const totalAmount = fines.reduce((sum, f) => sum + Number(f.amount), 0);

    res.json({ fines, totalAmount, groupId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch group receipt" });
  }
};

export const getUserFines = async (req, res) => {
  const { userId } = req.params;

  try {
    const [fines] = await db.query(
      `SELECT f.*, 
        bk.title AS book_title, 
        b.due_date, 
        b.borrowed_at,
        u.full_name AS processed_by_name
       FROM fines f
       JOIN borrows b ON f.borrow_id = b.id
       JOIN books bk ON b.book_id = bk.id
       LEFT JOIN users u ON f.processed_by = u.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    const [[{ totalUnpaid }]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalUnpaid
       FROM fines WHERE user_id = ? AND status = 'unpaid'`,
      [userId]
    );

    res.json({ fines, totalUnpaid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch fines" });
  }
};

// GET all fines for the logged-in student
export const getMyFines = async (req, res) => {
  const userId = req.user.id;
  const { status, startDate, endDate } = req.query;

  try {
    let where = "WHERE f.user_id = ?";
    const params = [userId];

    if (status) {
      where += " AND f.status = ?";
      params.push(status);
    }

    if (startDate && endDate) {
      where += " AND DATE(f.created_at) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    const [fines] = await db.query(
      `SELECT f.*,
        bk.title AS book_title,
        b.due_date,
        b.borrowed_at,
        u.full_name AS processed_by_name
       FROM fines f
       LEFT JOIN borrows b ON f.borrow_id = b.id
       LEFT JOIN books bk ON b.book_id = bk.id
       LEFT JOIN users u ON f.processed_by = u.id
       ${where}
       ORDER BY f.created_at DESC`,
      params
    );

    const [[{ totalUnpaid }]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalUnpaid
       FROM fines WHERE user_id = ? AND status = 'unpaid'`,
      [userId]
    );

    res.json({ fines, totalUnpaid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch fines" });
  }
};

// GET single fine for receipt
export const getReceiptData = async (req, res) => {
  const { fineId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const [fines] = await db.query(
      `SELECT f.*,
        bk.title AS book_title,
        b.due_date,
        b.borrowed_at,
        b.returned_at,
        u.full_name AS student_name,
        u.lrn AS student_lrn,
        u.email AS student_email,
        p.full_name AS processed_by_name
       FROM fines f
       LEFT JOIN borrows b ON f.borrow_id = b.id
       LEFT JOIN books bk ON b.book_id = bk.id
       JOIN users u ON f.user_id = u.id
       LEFT JOIN users p ON f.processed_by = p.id
       WHERE f.id = ?`,
      [fineId]
    );

    if (!fines.length) {
      return res.status(404).json({ message: "Fine not found" });
    }

    const fine = fines[0];

    // students can only view their own receipts
    if (role === "student" && fine.user_id !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(fine);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch receipt" });
  }
};

export const payFine = async (req, res) => {
  const { fineId } = req.params;
  const { amountPaid } = req.body;
  const processedBy = req.user.id;

  try {
    const [[fine]] = await db.query(
      `SELECT * FROM fines WHERE id = ?`,
      [fineId]
    );

    if (!fine) return res.status(404).json({ message: "Fine not found" });
    if (fine.status !== "unpaid") {
      return res.status(400).json({ message: "Fine is already resolved" });
    }

    const paidAmount = Number(amountPaid) || fine.amount;
    const changeAmount = Math.max(0, paidAmount - fine.amount);

    await db.query(
      `UPDATE fines 
       SET status = 'paid', 
           paid_at = NOW(), 
           processed_by = ?,
           amount_paid = ?,
           change_amount = ?
       WHERE id = ?`,
      [processedBy, paidAmount, changeAmount, fineId]
    );

    const [[{ totalUnpaid }]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalUnpaid
       FROM fines WHERE user_id = ? AND status = 'unpaid'`,
      [fine.user_id]
    );

    const message = totalUnpaid > 0
      ? `Your ₱${fine.amount} fine has been marked as paid. You still have ₱${totalUnpaid} in unpaid fines.`
      : `Your ₱${fine.amount} fine has been paid. You can now borrow books again.`;

    // Fine is already committed at this point — notification is best-effort.
    await sendNotification(req, {
      userId: fine.user_id,
      title: "Fine Paid — Receipt Available",
      message,
    });

    res.json({
      message: "Fine marked as paid",
      totalUnpaid,
      fineId: fine.id,
      changeAmount
    });
  } catch (err) {
    console.error("=== payFine ERROR ===", err.message);
    res.status(500).json({ message: "Failed to pay fine", error: err.message });
  }
};

export const waiveFine = async (req, res) => {
  const { fineId } = req.params;
  const processedBy = req.user.id;

  try {
    const [[fine]] = await db.query(
      `SELECT * FROM fines WHERE id = ?`,
      [fineId]
    );

    if (!fine) return res.status(404).json({ message: "Fine not found" });
    if (fine.status !== "unpaid") {
      return res.status(400).json({ message: "Fine is already resolved" });
    }

    await db.query(
      `UPDATE fines 
       SET status = 'waived', paid_at = NOW(), processed_by = ?
       WHERE id = ?`,
      [processedBy, fineId]
    );

    const [[{ totalUnpaid }]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalUnpaid
       FROM fines WHERE user_id = ? AND status = 'unpaid'`,
      [fine.user_id]
    );

    const message = totalUnpaid > 0
      ? `Your ₱${fine.amount} fine has been waived. You still have ₱${totalUnpaid} in unpaid fines.`
      : `Your ₱${fine.amount} fine has been waived. You can now borrow books again.`;

    // Fine is already committed at this point — notification is best-effort.
    await sendNotification(req, {
      userId: fine.user_id,
      title: "Fine Waived — Receipt Available",
      message,
    });

    res.json({ message: "Fine waived", totalUnpaid, fineId: fine.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to waive fine" });
  }
};

export const addManualFine = async (req, res) => {
  const { userId } = req.params;
  const { fine_type, amount, notes, borrow_id } = req.body;

  if (!fine_type || !amount) {
    return res.status(400).json({ message: "Fine type and amount are required" });
  }

  if (!["lost", "damaged", "other"].includes(fine_type)) {
    return res.status(400).json({ message: "Invalid fine type" });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO fines (user_id, borrow_id, amount, status, fine_type, notes)
       VALUES (?, ?, ?, 'unpaid', ?, ?)`,
      [userId, borrow_id || null, amount, fine_type, notes || null]
    );

    const [[{ totalUnpaid }]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalUnpaid
       FROM fines WHERE user_id = ? AND status = 'unpaid'`,
      [userId]
    );

    const typeLabel = fine_type.charAt(0).toUpperCase() + fine_type.slice(1);

    // Fine is already committed at this point — notification is best-effort.
    await sendNotification(req, {
      userId,
      title: `${typeLabel} Fine Added`,
      message: `A ₱${amount} ${fine_type} fine has been added to your account${notes ? `: ${notes}` : ""}. Your total unpaid balance is ₱${totalUnpaid}. You cannot borrow books until your fine is paid.`,
    });

    res.status(201).json({
      message: "Fine added successfully",
      fineId: result.insertId,
      totalUnpaid
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add fine" });
  }
};