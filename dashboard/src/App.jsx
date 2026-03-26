import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import TeacherPage from "./pages/TeacherPage";
import StudentPage from "./pages/StudentPage";

function roleHome(role) {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher";
  if (role === "student") return "/student";
  return "/login";
}

function AppShell({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto w-[min(1200px,95vw)] pb-7 pt-6">
      <header className="mb-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/85 px-5 py-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            CSMS Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Class Scheduling System</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
            {user.name} ({user.role})
          </span>
          <button
            type="button"
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

function RootRedirect() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={roleHome(user.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AppShell>
                  <AdminPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <AppShell>
                  <TeacherPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/student"
            element={
              <ProtectedRoute roles={["student"]}>
                <AppShell>
                  <StudentPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
