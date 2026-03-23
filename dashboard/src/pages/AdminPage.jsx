import { useEffect, useState } from "react";
import api from "../services/api";
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  updateSchedule,
} from "../services/scheduleService";
import { getUsers, createUser } from "../services/userService";
import { getSubjects, createSubject } from "../services/subjectService";
import { getRooms, createRoom } from "../services/roomService";
import { getAuditLogs } from "../services/auditService";
import { useAuth } from "../context/AuthContext";

const scheduleFormInit = {
  subject_id: "",
  teacher_id: "",
  room_id: "",
  section: "",
  day: "Monday",
  time_start: "07:30",
  time_end: "09:00",
};

const userFormInit = {
  name: "",
  email: "",
  password: "",
  role: "teacher",
};

const subjectFormInit = {
  code: "",
  name: "",
  units: 1,
};

const roomFormInit = {
  room_code: "",
  building: "",
  capacity: 30,
};

export default function AdminPage() {
  const { user } = useAuth();
  
  // Entities
  const [users, setUsers] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Forms
  const [scheduleForm, setScheduleForm] = useState(scheduleFormInit);
  const [userForm, setUserForm] = useState(userFormInit);
  const [subjectForm, setSubjectForm] = useState(subjectFormInit);
  const [roomForm, setRoomForm] = useState(roomFormInit);

  // UI State
  const [tab, setTab] = useState("schedules");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAll = async () => {
    try {
      const [allUsers, subjectRows, roomRows, scheduleRows, notifyRows, auditRows] = await Promise.all([
        getUsers(),
        getSubjects(),
        getRooms(),
        getSchedules(),
        api.get("/notifications", { params: { user_id: user.id } }),
        getAuditLogs(),
      ]);

      setUsers(allUsers);
      setTeachers(allUsers.filter((u) => u.role === "teacher"));
      setSubjects(subjectRows);
      setRooms(roomRows);
      setSchedules(scheduleRows);
      setNotifications(notifyRows.data);
      setAuditLogs(auditRows);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Failed to load admin data");
    }
  };

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        await loadAll();
      } catch (requestError) {
        if (mounted) {
          setError(requestError?.response?.data?.error || "Failed to load admin data");
        }
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (event, formType = "schedule") => {
    const { name, value } = event.target;
    if (formType === "schedule") setScheduleForm((prev) => ({ ...prev, [name]: value }));
    if (formType === "user") setUserForm((prev) => ({ ...prev, [name]: value }));
    if (formType === "subject") setSubjectForm((prev) => ({ ...prev, [name]: value }));
    if (formType === "room") setRoomForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleScheduleCreate = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await createSchedule({
        ...scheduleForm,
        admin_id: user.id,
      });

      setMessage("Schedule created successfully.");
      setScheduleForm(scheduleFormInit);
      await loadAll();
    } catch (requestError) {
      const payload = requestError?.response?.data;
      if (payload?.conflicts) {
        setError("Schedule conflict detected for room or teacher.");
      } else {
        setError(payload?.error || "Unable to create schedule.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleDelete = async (id) => {
    setMessage("");
    setError("");

    try {
      await deleteSchedule(id, user.id);
      setSchedules((prev) => prev.filter((row) => row.id !== id));
      setMessage("Schedule deleted.");
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Unable to delete schedule.");
    }
  };

  const handleUserCreate = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await createUser(userForm);
      setMessage("User created successfully.");
      setUserForm(userFormInit);
      await loadAll();
    } catch (requestError) {
      const payload = requestError?.response?.data;
      if (payload?.error?.includes("UNIQUE")) {
        setError("Email already exists.");
      } else {
        setError(payload?.error || "Unable to create user.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectCreate = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await createSubject({
        ...subjectForm,
        units: Number.parseInt(subjectForm.units, 10),
      });
      setMessage("Subject created successfully.");
      setSubjectForm(subjectFormInit);
      await loadAll();
    } catch (requestError) {
      const payload = requestError?.response?.data;
      if (payload?.error?.includes("UNIQUE")) {
        setError("Subject code already exists.");
      } else {
        setError(payload?.error || "Unable to create subject.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoomCreate = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await createRoom({
        ...roomForm,
        capacity: Number.parseInt(roomForm.capacity, 10),
      });
      setMessage("Room created successfully.");
      setRoomForm(roomFormInit);
      await loadAll();
    } catch (requestError) {
      const payload = requestError?.response?.data;
      if (payload?.error?.includes("UNIQUE")) {
        setError("Room code already exists.");
      } else {
        setError(payload?.error || "Unable to create room.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (requestError) {
      console.error("Failed to mark notification as read", requestError);
    }
  };

  return (
    <section className="page-shell">
      <header className="panel-head">
        <h2>Admin Dashboard</h2>
        <p>Manage users, subjects, rooms, schedules, and view audit logs.</p>
      </header>

      {message ? <p className="ok-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {/* Tab Navigation */}
      <div className="admin-tabs">
        {["users", "subjects", "rooms", "schedules", "notifications", "audit"].map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? "tab-active" : "tab-inactive"}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === "users" && (
        <div>
          <article className="panel">
            <h3>Create User</h3>
            <form className="form-grid two-col" onSubmit={handleUserCreate}>
              <label>
                Full Name
                <input
                  name="name"
                  value={userForm.name}
                  onChange={(e) => handleChange(e, "user")}
                  placeholder="Juan Dela Cruz"
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={userForm.email}
                  onChange={(e) => handleChange(e, "user")}
                  placeholder="user@school.local"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  name="password"
                  value={userForm.password}
                  onChange={(e) => handleChange(e, "user")}
                  placeholder="••••••••"
                  required
                />
              </label>

              <label>
                Role
                <select
                  name="role"
                  value={userForm.role}
                  onChange={(e) => handleChange(e, "user")}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </label>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Creating..." : "Create User"}
              </button>
            </form>
          </article>

          <article className="panel">
            <h3>All Users</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}

      {/* Subjects Tab */}
      {tab === "subjects" && (
        <div>
          <article className="panel">
            <h3>Create Subject</h3>
            <form className="form-grid two-col" onSubmit={handleSubjectCreate}>
              <label>
                Subject Code
                <input
                  name="code"
                  value={subjectForm.code}
                  onChange={(e) => handleChange(e, "subject")}
                  placeholder="CS101"
                  required
                />
              </label>

              <label>
                Subject Name
                <input
                  name="name"
                  value={subjectForm.name}
                  onChange={(e) => handleChange(e, "subject")}
                  placeholder="Introduction to Computer Science"
                  required
                />
              </label>

              <label>
                Units
                <input
                  type="number"
                  name="units"
                  value={subjectForm.units}
                  onChange={(e) => handleChange(e, "subject")}
                  min="1"
                  required
                />
              </label>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Creating..." : "Create Subject"}
              </button>
            </form>
          </article>

          <article className="panel">
            <h3>All Subjects</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Units</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr key={s.id}>
                      <td>{s.code}</td>
                      <td>{s.name}</td>
                      <td>{s.units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}

      {/* Rooms Tab */}
      {tab === "rooms" && (
        <div>
          <article className="panel">
            <h3>Create Room</h3>
            <form className="form-grid two-col" onSubmit={handleRoomCreate}>
              <label>
                Room Code
                <input
                  name="room_code"
                  value={roomForm.room_code}
                  onChange={(e) => handleChange(e, "room")}
                  placeholder="ROOM-101"
                  required
                />
              </label>

              <label>
                Building
                <input
                  name="building"
                  value={roomForm.building}
                  onChange={(e) => handleChange(e, "room")}
                  placeholder="Building A"
                  required
                />
              </label>

              <label>
                Capacity
                <input
                  type="number"
                  name="capacity"
                  value={roomForm.capacity}
                  onChange={(e) => handleChange(e, "room")}
                  min="1"
                  required
                />
              </label>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Creating..." : "Create Room"}
              </button>
            </form>
          </article>

          <article className="panel">
            <h3>All Rooms</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Building</th>
                    <th>Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r.id}>
                      <td>{r.room_code}</td>
                      <td>{r.building}</td>
                      <td>{r.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}

      {/* Schedules Tab */}
      {tab === "schedules" && (
        <div>
          <article className="panel">
            <h3>Create Schedule</h3>
            <form className="form-grid two-col" onSubmit={handleScheduleCreate}>
              <label>
                Subject
                <select
                  name="subject_id"
                  value={scheduleForm.subject_id}
                  onChange={(e) => handleChange(e, "schedule")}
                  required
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code} - {subject.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Teacher
                <select
                  name="teacher_id"
                  value={scheduleForm.teacher_id}
                  onChange={(e) => handleChange(e, "schedule")}
                  required
                >
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Room
                <select
                  name="room_id"
                  value={scheduleForm.room_id}
                  onChange={(e) => handleChange(e, "schedule")}
                  required
                >
                  <option value="">Select room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_code} ({room.building})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Section
                <input
                  name="section"
                  value={scheduleForm.section}
                  onChange={(e) => handleChange(e, "schedule")}
                  placeholder="BSIT-2A"
                  required
                />
              </label>

              <label>
                Day
                <select name="day" value={scheduleForm.day} onChange={(e) => handleChange(e, "schedule")}>
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                </select>
              </label>

              <label>
                Time Start
                <input
                  type="time"
                  name="time_start"
                  value={scheduleForm.time_start}
                  onChange={(e) => handleChange(e, "schedule")}
                  required
                />
              </label>

              <label>
                Time End
                <input
                  type="time"
                  name="time_end"
                  value={scheduleForm.time_end}
                  onChange={(e) => handleChange(e, "schedule")}
                  required
                />
              </label>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Saving..." : "Create Schedule"}
              </button>
            </form>
          </article>

          <article className="panel">
            <h3>Current Schedules</h3>
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
                    <th>Actions</th>
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
                      <td>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleScheduleDelete(row.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === "notifications" && (
        <article className="panel">
          <h3>Notifications</h3>
          {notifications.length === 0 ? (
            <p className="empty">No notifications.</p>
          ) : (
            <ul className="stack-list">
              {notifications.map((item) => (
                <li key={item.id} className={item.is_read ? "card note-read" : "card"}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <p>{item.message}</p>
                      <small>{new Date(item.created_at).toLocaleString()}</small>
                    </div>
                    {!item.is_read && (
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => handleNotificationRead(item.id)}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      )}

      {/* Audit Logs Tab */}
      {tab === "audit" && (
        <article className="panel">
          <h3>Audit Log</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Schedule</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.admin_name}</td>
                    <td>{log.action}</td>
                    <td>{log.section || "—"}</td>
                    <td>{new Date(log.changed_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </section>
  );
}
