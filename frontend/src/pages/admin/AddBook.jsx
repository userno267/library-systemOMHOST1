// src/pages/admin/AddBook.jsx
import { useState } from "react";
import axios from "axios";
import AdminSidebar from "../../components/AdminSidebar";
import AsyncCreatableSelect from "react-select/async-creatable";

// ── React-Select styles matching design system ────────────────────────────────
const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "6px",
    borderColor: state.isFocused ? "#14532D" : "#E4DFD3",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(20,83,45,0.12)" : "none",
    fontSize: "0.875rem",
    minHeight: "40px",
    fontFamily: "'Inter', sans-serif",
    background: "#fff",
    "&:hover": { borderColor: "#14532D" },
  }),
  menu: (base) => ({
    ...base, borderRadius: "6px", overflow: "hidden",
    border: "1px solid #E4DFD3", boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? "#14532D" : state.isFocused ? "#EEF3E7" : "white",
    color: state.isSelected ? "white" : "#241F18",
    fontSize: "0.875rem", fontFamily: "'Inter', sans-serif",
  }),
  multiValue: (base) => ({
    ...base, background: "#EEF3E7", borderRadius: "4px",
  }),
  multiValueLabel: (base) => ({
    ...base, color: "#14532D", fontSize: "0.8rem", fontWeight: 600,
  }),
  multiValueRemove: (base) => ({
    ...base, color: "#5C5546",
    "&:hover": { background: "#D4E8D4", color: "#14532D" },
  }),
  placeholder: (base) => ({ ...base, color: "#B0A89C", fontSize: "0.875rem" }),
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Book:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Upload:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  Package: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  QR:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/></svg>,
  Image:   () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  File:    () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Zip:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Plus:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
};

const EMPTY_FORM = {
  title: "", author: "", description: "", type: "physical", copies: 1,
  isbn: "", publisher: "", copyright_date: "", place_of_publication: "",
  volume: "", call_number: "", section: "",
};

export default function AddBook() {
  const [form, setForm]               = useState(EMPTY_FORM);
  const [subjects, setSubjects]       = useState([]);
  const [bookFile, setBookFile]       = useState(null);
  const [coverImage, setCoverImage]   = useState(null);
  const [bulkFile, setBulkFile]       = useState(null);
  const [qrCodePreview, setQrCode]    = useState(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [progress, setProgress]       = useState(0);
  const [coverPreview, setCoverPreview] = useState(null);

  const token = localStorage.getItem("token");
  const API   = import.meta.env.VITE_API_URL;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    setCoverImage(file);
    if (file) setCoverPreview(URL.createObjectURL(file));
  };

  /* ── Subject search ── */
  const loadSubjects = async (inputValue) => {
    if (!inputValue) return [];
    try {
      const res = await axios.get(`${API}/api/books/subjects`, {
        params: { q: inputValue },
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      return Array.isArray(res.data)
        ? res.data.map(s => ({ value: s.value || s.name || s, label: s.label || s.name || s }))
        : [];
    } catch (err) { console.error("Subject load error:", err); return []; }
  };

  /* ── Submit single book ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSingleLoading(true); setProgress(20);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      if (bookFile)   data.append("book_file",    bookFile);
      if (coverImage) data.append("cover_image",  coverImage);
      data.append("subjects", subjects.map(s => s.value).join(","));
      setProgress(60);
      const res = await axios.post(`${API}/api/books`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProgress(100);
      setQrCode(res.data.qrCodeText);
      setForm(EMPTY_FORM);
      setSubjects([]); setBookFile(null); setCoverImage(null); setCoverPreview(null);
    } catch (err) {
      console.error(err);
      alert("Failed to add book.");
    } finally { setSingleLoading(false); setProgress(0); }
  };

  /* ── Bulk upload ── */
  const handleBulkUpload = async () => {
    if (!bulkFile) return alert("Please select a ZIP file.");
    setBulkLoading(true); setProgress(10);
    try {
      const data = new FormData();
      data.append("zip", bulkFile);
      setProgress(50);
      const res = await axios.post(`${API}/api/books/bulk-upload`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProgress(100);
      alert(`Import complete: ${res.data.inserted}/${res.data.total} books added.`);
      setBulkFile(null);
    } catch (err) {
      console.error(err);
      alert("Bulk upload failed.");
    } finally { setBulkLoading(false); setProgress(0); }
  };

  return (
    <>
      <AdminSidebar />

      <div className="ab-main">

        {/* ── Page header ── */}
        <header className="ab-header">
          <div>
            <p className="ab-eyebrow">Library Inventory</p>
            <h1 className="ab-title">Add Book</h1>
          </div>
        </header>

        {/* ════════ SINGLE BOOK ════════ */}
        <div className="ab-card">
          <div className="ab-card-head">
            <div className="ab-card-head-icon"><Icons.Book /></div>
            <div>
              <p className="ab-card-title">Add Single Book</p>
              <p className="ab-card-sub">Fill in the cataloguing details below</p>
            </div>
          </div>
          <div className="ab-gold-rule" />

          <form onSubmit={handleSubmit} className="ab-form">

            {/* ── Basic info ── */}
            <div className="ab-section-label">Basic Information</div>
            <div className="ab-grid-2">
              <Field label="Title" required>
                <input className="ab-input" name="title" value={form.title} onChange={handleChange} placeholder="Book title" required />
              </Field>
              <Field label="Author" required>
                <input className="ab-input" name="author" value={form.author} onChange={handleChange} placeholder="Author name" required />
              </Field>
            </div>

            <Field label="Description">
              <textarea className="ab-textarea" name="description" value={form.description} onChange={handleChange} placeholder="Brief description of the book…" />
            </Field>

            {/* ── Cataloguing metadata ── */}
            <div className="ab-section-label" style={{ marginTop: 8 }}>Cataloguing Details</div>
            <div className="ab-meta-box">
              <div className="ab-grid-2">
                <Field label="ISBN">
                  <input className="ab-input ab-mono" name="isbn" value={form.isbn} onChange={handleChange} placeholder="e.g. 978-3-16-148410-0" />
                </Field>
                <Field label="Publisher">
                  <input className="ab-input" name="publisher" value={form.publisher} onChange={handleChange} placeholder="Publisher name" />
                </Field>
              </div>
              <div className="ab-grid-2">
                <Field label="Place of Publication">
                  <input className="ab-input" name="place_of_publication" value={form.place_of_publication} onChange={handleChange} placeholder="City, Country" />
                </Field>
                <Field label="Copyright Date">
                  <input className="ab-input" type="date" name="copyright_date" value={form.copyright_date} onChange={handleChange} />
                </Field>
              </div>
              <div className="ab-grid-3">
                <Field label="Volume">
                  <input className="ab-input ab-mono" name="volume" value={form.volume} onChange={handleChange} placeholder="e.g. Vol. 1" />
                </Field>
                <Field label="Call Number">
                  <input className="ab-input ab-mono" name="call_number" value={form.call_number} onChange={handleChange} placeholder="e.g. 001.64 B47" />
                </Field>
                <Field label="Section">
                  <input className="ab-input" name="section" value={form.section} onChange={handleChange} placeholder="e.g. Science" />
                </Field>
              </div>
            </div>

            {/* ── Type & copies ── */}
            <div className="ab-section-label" style={{ marginTop: 8 }}>Type & Availability</div>
            <div className="ab-grid-2">
              <Field label="Book Type">
                <select className="ab-input" name="type" value={form.type} onChange={handleChange}>
                  <option value="physical">Physical</option>
                  <option value="digital">Digital</option>
                </select>
              </Field>
              {form.type === "physical" && (
                <Field label="Number of Copies">
                  <input className="ab-input ab-mono" type="number" name="copies" value={form.copies} min="1" onChange={handleChange} />
                </Field>
              )}
            </div>

            {/* ── Subjects ── */}
            <div className="ab-section-label" style={{ marginTop: 8 }}>Subjects</div>
            <AsyncCreatableSelect
              isMulti cacheOptions defaultOptions
              loadOptions={loadSubjects}
              value={subjects}
              onChange={val => setSubjects(val || [])}
              placeholder="Type to search or create subjects…"
              closeMenuOnSelect={false}
              blurInputOnSelect={false}
              isClearable
              styles={selectStyles}
              formatCreateLabel={v => `Create subject "${v}"`}
              noOptionsMessage={({ inputValue }) =>
                inputValue ? `No match for "${inputValue}"` : "Type to search subjects"
              }
            />

            {/* ── File uploads ── */}
            <div className="ab-section-label" style={{ marginTop: 8 }}>Files</div>
            <div className="ab-file-row">
              {/* Cover image with live preview */}
              <div className="ab-file-zone">
                <div className="ab-file-zone-inner">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover preview" className="ab-cover-preview" />
                  ) : (
                    <div className="ab-file-placeholder">
                      <Icons.Image />
                      <span>Cover Image</span>
                      <span className="ab-file-hint">JPG / PNG</span>
                    </div>
                  )}
                  <label className="ab-file-label">
                    {coverPreview ? "Change image" : "Choose file"}
                    <input type="file" accept="image/*" onChange={handleCoverChange} style={{ display: "none" }} />
                  </label>
                </div>
              </div>

              {/* PDF file */}
              <div className="ab-file-zone ab-file-zone--wide">
                <div className="ab-file-zone-inner ab-file-zone-inner--row">
                  <div className="ab-file-placeholder">
                    <Icons.File />
                    <div>
                      <span>{bookFile ? bookFile.name : "Book File (PDF)"}</span>
                      <span className="ab-file-hint">{bookFile ? `${(bookFile.size / 1024 / 1024).toFixed(2)} MB` : "Upload the digital PDF of the book"}</span>
                    </div>
                  </div>
                  <label className="ab-file-label">
                    {bookFile ? "Change file" : "Choose file"}
                    <input type="file" accept=".pdf" onChange={e => setBookFile(e.target.files[0])} style={{ display: "none" }} />
                  </label>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {singleLoading && (
              <div className="ab-progress-wrap">
                <div className="ab-progress-bar" style={{ width: `${progress}%` }} />
              </div>
            )}

            <button type="submit" className="ab-submit-btn" disabled={singleLoading}>
              {singleLoading ? (
                <><div className="ab-btn-spinner" /> Adding book…</>
              ) : (
                <><Icons.Plus /> Add Book</>
              )}
            </button>
          </form>
        </div>

        {/* ════════ BULK UPLOAD ════════ */}
        <div className="ab-card">
          <div className="ab-card-head">
            <div className="ab-card-head-icon"><Icons.Package /></div>
            <div>
              <p className="ab-card-title">Bulk Import</p>
              <p className="ab-card-sub">Upload a ZIP file containing multiple books and metadata</p>
            </div>
          </div>
          <div className="ab-gold-rule" />

          <div className="ab-form" style={{ paddingTop: 20 }}>
            <div className="ab-file-zone ab-file-zone--wide" style={{ width: "100%" }}>
              <div className="ab-file-zone-inner ab-file-zone-inner--row">
                <div className="ab-file-placeholder">
                  <Icons.Zip />
                  <div>
                    <span>{bulkFile ? bulkFile.name : "ZIP Archive"}</span>
                    <span className="ab-file-hint">
                      {bulkFile
                        ? `${(bulkFile.size / 1024 / 1024).toFixed(2)} MB selected`
                        : "Select a .zip file containing book data and cover images"}
                    </span>
                  </div>
                </div>
                <label className="ab-file-label">
                  {bulkFile ? "Change file" : "Choose ZIP"}
                  <input type="file" accept=".zip" onChange={e => setBulkFile(e.target.files[0])} style={{ display: "none" }} />
                </label>
              </div>
            </div>

            {bulkLoading && (
              <div className="ab-progress-wrap">
                <div className="ab-progress-bar" style={{ width: `${progress}%` }} />
              </div>
            )}

            <button type="button" className="ab-submit-btn" onClick={handleBulkUpload} disabled={bulkLoading || !bulkFile}>
              {bulkLoading ? (
                <><div className="ab-btn-spinner" /> Uploading…</>
              ) : (
                <><Icons.Upload /> Upload ZIP</>
              )}
            </button>
          </div>
        </div>

        {/* ════════ QR RESULT ════════ */}
        {qrCodePreview && (
          <div className="ab-card ab-qr-card">
            <div className="ab-card-head">
              <div className="ab-card-head-icon"><Icons.QR /></div>
              <div>
                <p className="ab-card-title">Generated QR Code</p>
                <p className="ab-card-sub">Scan or print this code for the book</p>
              </div>
            </div>
            <div className="ab-gold-rule" />
            <div className="ab-qr-body">
              <img src={qrCodePreview} alt="QR Code" className="ab-qr-img" />
            </div>
          </div>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        :root {
          --forest:    #14532D;
          --forest-lt: #3E7A4D;
          --gold:      #B8860B;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
        }

        /* ── Layout ── */
        .ab-main {
          margin-left: 248px;
          padding: 36px 40px 64px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }

        /* ── Header ── */
        .ab-header { margin-bottom: 28px; }
        .ab-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .ab-title {
          font-family: 'Fraunces', serif; font-size: 2rem;
          font-weight: 600; color: var(--forest); margin: 0;
          letter-spacing: -0.01em;
        }

        /* ── Card ── */
        .ab-card {
          background: white; border: 1px solid var(--line);
          border-radius: 6px; overflow: hidden; margin-bottom: 24px;
        }
        .ab-card-head {
          display: flex; align-items: center; gap: 14px; padding: 18px 22px;
        }
        .ab-card-head-icon {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 6px;
          background: var(--sage); color: var(--forest); flex-shrink: 0;
        }
        .ab-card-title {
          font-family: 'Fraunces', serif; font-weight: 600;
          font-size: 1.05rem; color: var(--forest); margin: 0 0 2px;
        }
        .ab-card-sub { font-size: 0.78rem; color: var(--ink-soft); margin: 0; }

        .ab-gold-rule {
          height: 1px; margin: 0 22px;
          background: linear-gradient(90deg, var(--gold), transparent); opacity: 0.4;
        }

        /* ── Form ── */
        .ab-form {
          padding: 20px 22px 24px;
          display: flex; flex-direction: column; gap: 14px;
        }

        .ab-section-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.65rem; text-transform: uppercase;
          letter-spacing: 0.10em; color: var(--ink-soft);
          font-weight: 600; margin-bottom: -4px;
        }

        .ab-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ab-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

        /* Field wrapper */
        .ab-field { display: flex; flex-direction: column; gap: 5px; }
        .ab-label {
          font-size: 0.75rem; font-weight: 600;
          color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.06em;
        }
        .ab-label-required::after {
          content: ' *'; color: #A13D2B; font-weight: 700;
        }

        /* Inputs */
        .ab-input {
          border: 1px solid var(--line); border-radius: 6px;
          padding: 9px 12px; font-size: 0.875rem;
          font-family: 'Inter', sans-serif; color: var(--ink);
          background: white; outline: none; width: 100%;
          box-sizing: border-box; transition: border-color 0.15s;
        }
        .ab-input:focus { border-color: var(--forest); }
        .ab-input::placeholder { color: #B0A89C; }
        .ab-mono { font-family: 'IBM Plex Mono', monospace; }

        .ab-textarea {
          border: 1px solid var(--line); border-radius: 6px;
          padding: 9px 12px; font-size: 0.875rem;
          font-family: 'Inter', sans-serif; color: var(--ink);
          background: white; outline: none; width: 100%;
          min-height: 90px; resize: vertical;
          box-sizing: border-box; transition: border-color 0.15s; line-height: 1.6;
        }
        .ab-textarea:focus { border-color: var(--forest); }
        .ab-textarea::placeholder { color: #B0A89C; }

        /* Metadata inset box */
        .ab-meta-box {
          border: 1px solid var(--line); border-radius: 6px;
          padding: 16px; background: #FDFAF5;
          display: flex; flex-direction: column; gap: 12px;
        }

        /* File upload zones */
        .ab-file-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .ab-file-zone {
          border: 1px dashed var(--line); border-radius: 6px;
          background: #FDFAF5; overflow: hidden;
          transition: border-color 0.15s;
          width: 160px; flex-shrink: 0;
        }
        .ab-file-zone--wide { flex: 1; min-width: 240px; width: auto; }
        .ab-file-zone:hover { border-color: var(--forest); }

        .ab-file-zone-inner {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px; padding: 20px 14px; min-height: 120px;
        }
        .ab-file-zone-inner--row {
          flex-direction: row; justify-content: space-between;
          padding: 16px 18px; min-height: 0;
        }

        .ab-cover-preview {
          width: 100%; max-height: 160px; object-fit: cover;
          border-radius: 3px;
        }

        .ab-file-placeholder {
          display: flex; align-items: center; gap: 10px;
          color: var(--ink-soft);
        }
        .ab-file-zone-inner:not(.ab-file-zone-inner--row) .ab-file-placeholder {
          flex-direction: column; text-align: center; gap: 6px;
        }
        .ab-file-placeholder svg { opacity: 0.5; }
        .ab-file-placeholder span { font-size: 0.82rem; color: var(--ink); }
        .ab-file-hint { font-size: 0.72rem; color: var(--ink-soft); display: block; }

        .ab-file-label {
          display: inline-flex; align-items: center;
          padding: 6px 12px; border-radius: 5px;
          border: 1px solid var(--line); background: white;
          font-size: 0.78rem; font-weight: 600; color: var(--forest);
          cursor: pointer; white-space: nowrap;
          transition: background 0.12s, border-color 0.12s;
        }
        .ab-file-label:hover { background: var(--sage); border-color: var(--forest); }

        /* Progress */
        .ab-progress-wrap {
          height: 4px; background: var(--line); border-radius: 99px; overflow: hidden;
        }
        .ab-progress-bar {
          height: 100%; background: var(--forest); border-radius: 99px;
          transition: width 0.3s ease;
        }

        /* Submit button */
        .ab-submit-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 12px; background: var(--forest);
          color: white; border: none; border-radius: 6px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.15s;
        }
        .ab-submit-btn:hover:not(:disabled) { background: var(--forest-lt); }
        .ab-submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .ab-btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: ab-spin 0.7s linear infinite;
        }
        @keyframes ab-spin { to { transform: rotate(360deg); } }

        /* QR card */
        .ab-qr-card { border-color: var(--gold); border-top: 2px solid var(--gold); }
        .ab-qr-body {
          display: flex; justify-content: center; padding: 24px 22px;
        }
        .ab-qr-img { width: 180px; border-radius: 4px; }

        /* ── Responsive ── */
        @media (max-width: 1000px) {
          .ab-main { margin-left: 0; padding: 24px 20px 48px; }
        }
        @media (max-width: 640px) {
          .ab-grid-2, .ab-grid-3 { grid-template-columns: 1fr; }
          .ab-file-row { flex-direction: column; }
          .ab-file-zone { width: 100%; }
        }
      `}</style>
    </>
  );
}

/* ── Field wrapper component ── */
function Field({ label, required, children }) {
  return (
    <div className="ab-field">
      <label className={`ab-label ${required ? "ab-label-required" : ""}`}>{label}</label>
      {children}
    </div>
  );
}