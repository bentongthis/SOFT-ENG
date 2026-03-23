import { useEffect, useState } from "react";
import api from "../services/api";
import { getSchedules } from "../services/scheduleService";
import { useAuth } from "../context/AuthContext";

export default function StudentPage() {
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

        setSchedules(scheduleRows);
        setNotifications(notificationRes.data);
      } catch (requestError) {
        if (mounted) {
          setError(requestError?.response?.data?.error || "Failed to load student view");
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [user.id]);

  return (
    <section className="page-shell">
      <header className="panel-head panel-head-inline">
        <div>
          <h2>Student View</h2>
          <p>Browse class offerings and print your page view.</p>
        </div>
        <button type="button" className="btn-outline" onClick={() => window.print()}>
          Print PDF
        </button>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      <article className="panel">
        <h3>Published Schedules</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Teacher</th>
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
                  <td>{row.teacher_name}</td>
                  <td>{row.section}</td>
                  <td>{row.day}</td>
                  <td>{row.time_start} - {row.time_end}</td>
                  <td>{row.room_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <h3>Notifications</h3>
        {notifications.length === 0 ? (
          <p className="empty">No updates for your account.</p>
        ) : (
          <ul className="stack-list">
            {notifications.map((item) => (
              <li key={item.id} className={item.is_read ? "card note-read" : "card"}>
                <p>{item.message}</p>
                <small>{item.created_at}</small>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
