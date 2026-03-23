import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerUser } from "../services/authService";

function roleHome(role) {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher";
  if (role === "student") return "/student";
  return "/login";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isRegisterMode = mode === "register";

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (isRegisterMode) {
        await registerUser({ name, email, password, role });
        setSuccess("Account created. Signing you in...");
      }

      const user = await login(email, password);
      navigate(roleHome(user.role), { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Unable to continue");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Classroom Scheduling</p>
        <h1>{isRegisterMode ? "Create your account" : "Welcome back"}</h1>
        <p className="subtle">
          {isRegisterMode
            ? "Register, then you will be signed in automatically."
            : "Use your account role to access the right dashboard."}
        </p>

        <div className="auth-actions">
          <button
            type="button"
            className={isRegisterMode ? "btn-outline" : "btn-primary"}
            onClick={() => switchMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={isRegisterMode ? "btn-primary" : "btn-outline"}
            onClick={() => switchMode("register")}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          {isRegisterMode ? (
            <label>
              Full name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Juan Dela Cruz"
                required
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teacher@school.edu"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {isRegisterMode ? (
            <label>
              Role
              <select value={role} onChange={(event) => setRole(event.target.value)} required>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          ) : null}

          {success ? <p className="ok-text">{success}</p> : null}

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? isRegisterMode
                ? "Creating account..."
                : "Signing in..."
              : isRegisterMode
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
