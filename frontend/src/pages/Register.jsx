// src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout, { Field } from "../components/AuthLayout";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    lrn: "",
    email: "",
    phone: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Registration failed");
        return;
      }

      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="New account"
      title="Create your account"
      subtitle="Register to borrow books, track your fines, and get library updates."
      footer={
        <>
          Already registered? <Link to="/">Sign in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="al-form">
        <Field label="Full Name">
          <input
            className="al-input"
            type="text"
            name="full_name"
            placeholder="Juan dela Cruz"
            value={form.full_name}
            onChange={handleChange}
            autoComplete="name"
            required
          />
        </Field>

        <Field
          label="LRN / Employee No."
          hint="Students use their LRN. Staff use their employee number."
        >
          <input
            className="al-input"
            type="text"
            name="lrn"
            placeholder="LRN or employee number"
            value={form.lrn}
            onChange={handleChange}
            required
          />
        </Field>

        <Field label="Email">
          <input
            className="al-input"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </Field>

        <Field label="Phone Number">
          <input
            className="al-input"
            type="tel"
            name="phone"
            placeholder="09xx xxx xxxx"
            value={form.phone}
            onChange={handleChange}
            pattern="[0-9+\-\s]{7,15}"
            title="Enter a valid phone number"
            autoComplete="tel"
            required
          />
        </Field>

        <Field label="Password">
          <input
            className="al-input"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
        </Field>

        <label className="al-check">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={() => setShowPassword((v) => !v)}
          />
          Show password
        </label>

        <button type="submit" className="al-btn" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}