import { useEffect, useState } from "react";
import api from "../services/api";
import { getSchedules } from "../services/scheduleService";
import { useAuth } from "../context/AuthContext";

export default function TeacherPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [scheduleRows, notificationRes] = await Promise.all([
          getSchedules(),
          api.get("/notifications", { params: { user_id: user.id } }),
        ]);

        if (!mounted) {
          return;
        }

        setSchedules(scheduleRows.filter((row) => row.teacher_id === user.id));
        setNotifications(notificationRes.data);
      } catch (requestError) {
        if (mounted) {
          setError(requestError?.response?.data?.error || "Failed to load teacher view");
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [user.id]);

  const panelClass =
    "rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm";
  const tableWrapClass = "mt-3 overflow-auto rounded-xl border border-slate-200";
  const tableClass =
    "w-full border-collapse text-sm [&_th]:border-b [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-slate-600 [&_td]:border-b [&_td]:border-slate-100 [&_td]:px-3 [&_td]:py-2.5 [&_td]:text-slate-800";

  return (
    <section className="grid gap-4">
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur-sm">
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-200/55 blur-2xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-20 h-44 w-44 rounded-full bg-sky-200/55 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Teacher Space</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Your Teaching Hub</h2>
            <p className="mt-1 text-sm text-slate-600">Your assigned schedules and latest updates.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700">
            Active classes: <span className="font-semibold text-slate-900">{schedules.length}</span>
          </div>
        </div>
      </header>

      {error ? <p className="m-0 font-semibold text-rose-700">{error}</p> : null}

      <article className={panelClass}>
        <h3 className="m-0 text-lg font-semibold text-slate-900">My Schedule</h3>
        {schedules.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No assigned classes yet.</p>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Section</th>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Room</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((row) => (
                  <tr key={row.id}>
                    <td>{row.subject_code} - {row.subject_name}</td>
                    <td>{row.section}</td>
                    <td>{row.day}</td>
                    <td>{row.time_start} - {row.time_end}</td>
                    <td>{row.room_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className={panelClass}>
        <h3 className="m-0 text-lg font-semibold text-slate-900">Notifications</h3>
        {notifications.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <ul className="mt-3 grid list-none gap-3 p-0">
            {notifications.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border border-slate-200 bg-white p-3 ${item.is_read ? "opacity-70" : ""}`}
              >
                <p className="m-0 text-sm text-slate-800">{item.message}</p>
                <small className="mt-1 block text-xs text-slate-500">{item.created_at}</small>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
