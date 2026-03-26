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

  const modeButtonClass = (active) =>
    active
      ? "rounded-xl bg-gradient-to-r from-emerald-700 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
      : "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50";

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
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white/85 p-8 shadow-[0_24px_70px_-30px_rgba(2,6,23,0.45)] backdrop-blur-sm sm:p-10">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Classroom Scheduling
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
          {isRegisterMode ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          {isRegisterMode
            ? "Register, then you will be signed in automatically."
            : "Use your account role to access the right dashboard."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            className={modeButtonClass(!isRegisterMode)}
            onClick={() => switchMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={modeButtonClass(isRegisterMode)}
            onClick={() => switchMode("register")}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          {isRegisterMode ? (
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Full name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                required
              />
            </label>
          ) : null}

          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              required
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              required
            />
          </label>

          {isRegisterMode ? (
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                required
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          ) : null}

          {success ? <p className="m-0 font-semibold text-emerald-700">{success}</p> : null}

          {error ? <p className="m-0 font-semibold text-rose-700">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-emerald-700 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65"
            disabled={loading}
          >
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
