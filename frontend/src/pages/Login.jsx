// src/pages/Login.jsx
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import AuthLayout, { Field } from "../components/AuthLayout";

export default function Login() {
  const navigate = useNavigate();
  const { loginUser } = useContext(AuthContext);

  const [lrn, setLrn] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lrn, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Unverified account — send them to the verify screen instead of a dead-end alert.
        if (data.needsVerification && data.email) {
          alert(data.message || "Please verify your email before logging in.");
          navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
          return;
        }

        return alert(data.message || "Invalid credentials");
      }

      loginUser(data.user, data.token);
      navigate("/home");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Use your LRN or employee number and your password."
      footer={
        <>
          New here? <Link to="/register">Create an account</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="al-form">
        <Field label="LRN / Employee No.">
          <input
            className="al-input"
            type="text"
            name="lrn"
            placeholder="Enter your LRN or employee number"
            value={lrn}
            onChange={(e) => setLrn(e.target.value)}
            autoComplete="username"
            required
          />
        </Field>

        <Field label="Password">
          <input
            className="al-input"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
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
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}