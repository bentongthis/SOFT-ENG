const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 5000;
const dbPath = path.join(__dirname, "school.db");
const db = new Database(dbPath);

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

app.use(
	cors({
		origin(origin, callback) {
			if (!origin || allowedOrigins.includes(origin)) {
				return callback(null, true);
			}

			return callback(new Error(`CORS blocked for origin: ${origin}`));
		},
	})
);
app.use(express.json());

function hashPassword(password) {
	return crypto.createHash("sha256").update(password).digest("hex");
}

function normalizeRole(role) {
	return String(role || "").trim().toLowerCase();
}

function parsePositiveInt(value) {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return null;
	}

	return parsed;
}

function isValidTimeRange(start, end) {
	return /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && start < end;
}

function createNotification(userId, message, type, scheduleId = null) {
	db.prepare(
		`INSERT INTO notification (user_id, schedule_id, message, type) VALUES (?, ?, ?, ?)`
	).run(userId, scheduleId, message, type);
}

function createAudit(adminId, action, scheduleId = null) {
	if (!adminId) {
		return;
	}

	db.prepare(`INSERT INTO audit_log (admin_id, schedule_id, action) VALUES (?, ?, ?)`)
		.run(adminId, scheduleId, action);
}

function detectScheduleConflicts({
	scheduleId = null,
	teacherId,
	roomId,
	day,
	timeStart,
	timeEnd,
}) {
	const whereExclusion = scheduleId ? "AND s.id != @scheduleId" : "";

	const roomConflicts = db.prepare(
		`SELECT s.id, s.section, s.time_start, s.time_end, r.room_code
		 FROM schedule s
		 JOIN room r ON r.id = s.room_id
		 WHERE s.day = @day
		   AND s.room_id = @roomId
		   AND @timeStart < s.time_end
		   AND @timeEnd > s.time_start
		   ${whereExclusion}`
	).all({
		scheduleId,
		roomId,
		day,
		timeStart,
		timeEnd,
	});

	const teacherConflicts = db.prepare(
		`SELECT s.id, s.section, s.time_start, s.time_end, u.name AS teacher_name
		 FROM schedule s
		 JOIN "user" u ON u.id = s.teacher_id
		 WHERE s.day = @day
		   AND s.teacher_id = @teacherId
		   AND @timeStart < s.time_end
		   AND @timeEnd > s.time_start
		   ${whereExclusion}`
	).all({
		scheduleId,
		teacherId,
		day,
		timeStart,
		timeEnd,
	});

	return { roomConflicts, teacherConflicts };
}

function toScheduleResponse(row) {
	return {
		id: row.id,
		subject_id: row.subject_id,
		subject_code: row.subject_code,
		subject_name: row.subject_name,
		teacher_id: row.teacher_id,
		teacher_name: row.teacher_name,
		room_id: row.room_id,
		room_code: row.room_code,
		section: row.section,
		day: row.day,
		time_start: row.time_start,
		time_end: row.time_end,
	};
}

function initDatabase() {
	db.pragma("foreign_keys = ON");

	db.exec(`
		CREATE TABLE IF NOT EXISTS "user" (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS subject (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			units INTEGER NOT NULL CHECK (units > 0)
		);

		CREATE TABLE IF NOT EXISTS room (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			room_code TEXT NOT NULL UNIQUE,
			building TEXT NOT NULL,
			capacity INTEGER NOT NULL CHECK (capacity > 0)
		);

		CREATE TABLE IF NOT EXISTS schedule (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			subject_id INTEGER NOT NULL,
			teacher_id INTEGER NOT NULL,
			room_id INTEGER NOT NULL,
			section TEXT NOT NULL,
			day TEXT NOT NULL,
			time_start TEXT NOT NULL,
			time_end TEXT NOT NULL,
			FOREIGN KEY (subject_id) REFERENCES subject (id) ON UPDATE CASCADE ON DELETE RESTRICT,
			FOREIGN KEY (teacher_id) REFERENCES "user" (id) ON UPDATE CASCADE ON DELETE RESTRICT,
			FOREIGN KEY (room_id) REFERENCES room (id) ON UPDATE CASCADE ON DELETE RESTRICT
		);

		CREATE TABLE IF NOT EXISTS notification (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			schedule_id INTEGER,
			message TEXT NOT NULL,
			type TEXT NOT NULL,
			is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES "user" (id) ON UPDATE CASCADE ON DELETE CASCADE,
			FOREIGN KEY (schedule_id) REFERENCES schedule (id) ON UPDATE CASCADE ON DELETE SET NULL
		);

		CREATE TABLE IF NOT EXISTS audit_log (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			admin_id INTEGER NOT NULL,
			schedule_id INTEGER,
			action TEXT NOT NULL,
			changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (admin_id) REFERENCES "user" (id) ON UPDATE CASCADE ON DELETE RESTRICT,
			FOREIGN KEY (schedule_id) REFERENCES schedule (id) ON UPDATE CASCADE ON DELETE SET NULL
		);

		CREATE INDEX IF NOT EXISTS idx_schedule_subject_id ON schedule (subject_id);
		CREATE INDEX IF NOT EXISTS idx_schedule_teacher_id ON schedule (teacher_id);
		CREATE INDEX IF NOT EXISTS idx_schedule_room_id ON schedule (room_id);
		CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification (user_id);
		CREATE INDEX IF NOT EXISTS idx_notification_schedule_id ON notification (schedule_id);
		CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON audit_log (admin_id);
		CREATE INDEX IF NOT EXISTS idx_audit_log_schedule_id ON audit_log (schedule_id);
	`);
}

app.get("/api/health", (req, res) => {
	res.json({
		status: "ok",
		db: dbPath,
	});
});

app.post("/api/auth/register", (req, res) => {
	try {
		const { name, email, password, role } = req.body;
		const normalizedRole = normalizeRole(role);
		const allowedRoles = ["admin", "teacher", "student"];

		if (!name || !email || !password || !allowedRoles.includes(normalizedRole)) {
			return res.status(400).json({
				error: "name, email, password and role (admin|teacher|student) are required",
			});
		}

		const exists = db.prepare(`SELECT id FROM "user" WHERE email = ?`).get(email);
		if (exists) {
			return res.status(409).json({ error: "Email already exists" });
		}

		const info = db
			.prepare(
				`INSERT INTO "user" (name, email, password_hash, role) VALUES (?, ?, ?, ?)`
			)
			.run(name, email, hashPassword(password), normalizedRole);

		return res.status(201).json({
			id: info.lastInsertRowid,
			name,
			email,
			role: normalizedRole,
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

app.post("/api/auth/login", (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ error: "email and password are required" });
		}

		const user = db
			.prepare(`SELECT id, name, email, role, password_hash FROM "user" WHERE email = ?`)
			.get(email);

		if (!user || user.password_hash !== hashPassword(password)) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		return res.json({
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

app.get("/api/users", (req, res) => {
	try {
		const role = normalizeRole(req.query.role);
		if (role) {
			const rows = db
				.prepare(
					`SELECT id, name, email, role, created_at FROM "user" WHERE role = ? ORDER BY name`
				)
				.all(role);
			return res.json(rows);
		}

		const rows = db
			.prepare(`SELECT id, name, email, role, created_at FROM "user" ORDER BY created_at DESC`)
			.all();
		return res.json(rows);
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

app.post("/api/users", (req, res) => {
	try {
		const { name, email, password, role } = req.body;
		const normalizedRole = normalizeRole(role);
		if (!name || !email || !password || !normalizedRole) {
			return res.status(400).json({
				error: "name, email, password and role are required",
			});
		}

		const info = db
			.prepare(`INSERT INTO "user" (name, email, password_hash, role) VALUES (?, ?, ?, ?)`)
			.run(name, email, hashPassword(password), normalizedRole);

		const created = db
			.prepare(`SELECT id, name, email, role, created_at FROM "user" WHERE id = ?`)
			.get(info.lastInsertRowid);

		return res.status(201).json(created);
	} catch (error) {
		if (String(error.message).includes("UNIQUE")) {
			return res.status(409).json({ error: "Email already exists" });
		}

		return res.status(500).json({ error: error.message });
	}
});

app.get("/api/rooms", (req, res) => {
	try {
		const rows = db.prepare(`SELECT * FROM room ORDER BY building, room_code`).all();
		return res.json(rows);
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

app.get("/api/subjects", (req, res) => {
	try {
		const rows = db.prepare(`SELECT * FROM subject ORDER BY code`).all();
		return res.json(rows);
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

app.post("/api/subjects", (req, res) => {
	try {
		const { code, name, units } = req.body;
		const parsedUnits = parsePositiveInt(units);
		if (!code || !name || !parsedUnits) {
			return res.status(400).json({ error: "code, name and positive units are required" });
		}

		const info = db
			.prepare(`INSERT INTO subject (code, name, units) VALUES (?, ?, ?)`)
			.run(code, name, parsedUnits);

		const created = db.prepare(`SELECT * FROM subject WHERE id = ?`).get(info.lastInsertRowid);
		return res.status(201).json(created);
	} catch (error) {
		if (String(error.message).includes("UNIQUE")) {
			return res.status(409).json({ error: "Subject code already exists" });
		}

		return res.status(500).json({ error: error.message });
	}
});

app.post("/api/rooms", (req, res) => {
	try {
		const { room_code, building, capacity } = req.body;
		const parsedCapacity = parsePositiveInt(capacity);
		if (!room_code || !building || !parsedCapacity) {
			return res.status(400).json({
				error: "room_code, building and positive capacity are required",
			});
		}

		const info = db
			.prepare(`INSERT INTO room (room_code, building, capacity) VALUES (?, ?, ?)`)
			.run(room_code, building, parsedCapacity);

		const created = db.prepare(`SELECT * FROM room WHERE id = ?`).get(info.lastInsertRowid);
		return res.status(201).json(created);
	} catch (error) {
		if (String(error.message).includes("UNIQUE")) {
			return res.status(409).json({ error: "room_code already exists" });
		}

		return res.status(500).json({ error: error.message });
	}
});

app.get("/api/schedules", (req, res) => {
	try {
		const rows = db
			.prepare(
				`SELECT s.*, sub.code AS subject_code, sub.name AS subject_name,
				        u.name AS teacher_name, r.room_code
				 FROM schedule s
				 JOIN subject sub ON sub.id = s.subject_id
				 JOIN "user" u ON u.id = s.teacher_id
				 JOIN room r ON r.id = s.room_id
				 ORDER BY s.day, s.time_start, s.section`
			)
			.all();

		return res.json(rows.map(toScheduleResponse));
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

app.post("/api/schedules", (req, res) => {
	try {
		const {
			subject_id,
			teacher_id,
			room_id,
			section,
			day,
			time_start,
			time_end,
			admin_id,
		} = req.body;

		const subjectId = parsePositiveInt(subject_id);
		const teacherId = parsePositiveInt(teacher_id);
		const roomId = parsePositiveInt(room_id);
		const adminId = parsePositiveInt(admin_id);

		if (!subjectId || !teacherId || !roomId || !section || !day || !time_start || !time_end) {
			return res.status(400).json({ error: "Missing required schedule fields" });
		}

		if (!isValidTimeRange(time_start, time_end)) {
			return res.status(400).json({ error: "time_start and time_end must be HH:MM and start < end" });
		}

		const conflicts = detectScheduleConflicts({
			teacherId,
			roomId,
			day,
			timeStart: time_start,
			timeEnd: time_end,
		});

		if (conflicts.roomConflicts.length || conflicts.teacherConflicts.length) {
			return res.status(409).json({
				error: "Schedule conflict detected",
				conflicts,
			});
		}

		const info = db
			.prepare(
				`INSERT INTO schedule (subject_id, teacher_id, room_id, section, day, time_start, time_end)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			)
			.run(subjectId, teacherId, roomId, section, day, time_start, time_end);

		createAudit(adminId, "CREATE_SCHEDULE", info.lastInsertRowid);
		createNotification(
			teacherId,
			`New schedule assigned: ${section} ${day} ${time_start}-${time_end}`,
			"schedule_created",
			info.lastInsertRowid
		);

		const created = db
			.prepare(
				`SELECT s.*, sub.code AS subject_code, sub.name AS subject_name,
				        u.name AS teacher_name, r.room_code
				 FROM schedule s
				 JOIN subject sub ON sub.id = s.subject_id
				 JOIN "user" u ON u.id = s.teacher_id
				 JOIN room r ON r.id = s.room_id
				 WHERE s.id = ?`
			)
			.get(info.lastInsertRowid);

		return res.status(201).json(toScheduleResponse(created));
	} catch (error) {
		if (String(error.message).includes("FOREIGN KEY")) {
			return res.status(400).json({ error: "Invalid subject_id, teacher_id, or room_id" });
		}

		return res.status(500).json({ error: error.message });
	}
});

app.put("/api/schedules/:id", (req, res) => {
	try {
		const scheduleId = parsePositiveInt(req.params.id);
		if (!scheduleId) {
			return res.status(400).json({ error: "Invalid schedule id" });
		}

		const existing = db.prepare(`SELECT * FROM schedule WHERE id = ?`).get(scheduleId);
		if (!existing) {
			return res.status(404).json({ error: "Schedule not found" });
		}

		const {
			subject_id,
			teacher_id,
			room_id,
			section,
			day,
			time_start,
			time_end,
			admin_id,
		} = req.body;

		const subjectId = parsePositiveInt(subject_id);
		const teacherId = parsePositiveInt(teacher_id);
		const roomId = parsePositiveInt(room_id);
		const adminId = parsePositiveInt(admin_id);

		if (!subjectId || !teacherId || !roomId || !section || !day || !time_start || !time_end) {
			return res.status(400).json({ error: "Missing required schedule fields" });
		}

		if (!isValidTimeRange(time_start, time_end)) {
			return res.status(400).json({ error: "time_start and time_end must be HH:MM and start < end" });
		}

		const conflicts = detectScheduleConflicts({
			scheduleId,
			teacherId,
			roomId,
			day,
			timeStart: time_start,
			timeEnd: time_end,
		});

		if (conflicts.roomConflicts.length || conflicts.teacherConflicts.length) {
			return res.status(409).json({
				error: "Schedule conflict detected",
				conflicts,
			});
		}

		db.prepare(
			`UPDATE schedule
			 SET subject_id = ?, teacher_id = ?, room_id = ?, section = ?, day = ?, time_start = ?, time_end = ?
			 WHERE id = ?`
		).run(subjectId, teacherId, roomId, section, day, time_start, time_end, scheduleId);

		createAudit(adminId, "UPDATE_SCHEDULE", scheduleId);
		createNotification(
			teacherId,
			`Schedule updated: ${section} ${day} ${time_start}-${time_end}`,
			"schedule_updated",
			scheduleId
		);

		const updated = db
			.prepare(
				`SELECT s.*, sub.code AS subject_code, sub.name AS subject_name,
				        u.name AS teacher_name, r.room_code
				 FROM schedule s
				 JOIN subject sub ON sub.id = s.subject_id
				 JOIN "user" u ON u.id = s.teacher_id
				 JOIN room r ON r.id = s.room_id
				 WHERE s.id = ?`
			)
			.get(scheduleId);

		return res.json(toScheduleResponse(updated));
	} catch (error) {
		if (String(error.message).includes("FOREIGN KEY")) {
			return res.status(400).json({ error: "Invalid subject_id, teacher_id, or room_id" });
		}

		return res.status(500).json({ error: error.message });
	}
});

app.delete("/api/schedules/:id", (req, res) => {
	try {
		const scheduleId = parsePositiveInt(req.params.id);
		const adminId = parsePositiveInt(req.query.admin_id);
		if (!scheduleId) {
			return res.status(400).json({ error: "Invalid schedule id" });
		}

		const info = db.prepare(`DELETE FROM schedule WHERE id = ?`).run(scheduleId);
		if (!info.changes) {
			return res.status(404).json({ error: "Schedule not found" });
		}

		createAudit(adminId, "DELETE_SCHEDULE", scheduleId);
		return res.json({ success: true });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

app.get("/api/notifications", (req, res) => {
	try {
		const userId = parsePositiveInt(req.query.user_id);
		if (!userId) {
			return res.status(400).json({ error: "user_id query param is required" });
		}

		const rows = db
			.prepare(
				`SELECT n.*,
				        s.section, s.day, s.time_start, s.time_end
				 FROM notification n
				 LEFT JOIN schedule s ON s.id = n.schedule_id
				 WHERE n.user_id = ?
				 ORDER BY n.created_at DESC`
			)
			.all(userId);

		return res.json(rows);
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

app.patch("/api/notifications/:id/read", (req, res) => {
	try {
		const id = parsePositiveInt(req.params.id);
		if (!id) {
			return res.status(400).json({ error: "Invalid notification id" });
		}

		const info = db.prepare(`UPDATE notification SET is_read = 1 WHERE id = ?`).run(id);
		if (!info.changes) {
			return res.status(404).json({ error: "Notification not found" });
		}

		return res.json({ success: true });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

app.get("/api/audit", (req, res) => {
	try {
		const rows = db
			.prepare(
				`SELECT a.*, u.name AS admin_name, s.section, s.day
				 FROM audit_log a
				 JOIN "user" u ON u.id = a.admin_id
				 LEFT JOIN schedule s ON s.id = a.schedule_id
				 ORDER BY a.changed_at DESC`
			)
			.all();

		return res.json(rows);
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

if (require.main === module) {
	initDatabase();

	app.listen(PORT, () => {
		console.log(`Server running on http://localhost:${PORT}`);
		console.log(`SQLite DB ready at ${dbPath}`);
	});
}

module.exports = {
	app,
	db,
	initDatabase,
};
