const { db, initDatabase } = require("./index");

function resetData() {
	initDatabase();

	db.exec(`
		DELETE FROM audit_log;
		DELETE FROM notification;
		DELETE FROM schedule;
		DELETE FROM subject;
		DELETE FROM room;
		DELETE FROM "user";
		DELETE FROM sqlite_sequence WHERE name IN ('audit_log', 'notification', 'schedule', 'subject', 'room', 'user');
	`);

	const counts = {
		users: db.prepare(`SELECT COUNT(*) AS count FROM "user"`).get().count,
		subjects: db.prepare(`SELECT COUNT(*) AS count FROM subject`).get().count,
		rooms: db.prepare(`SELECT COUNT(*) AS count FROM room`).get().count,
		schedules: db.prepare(`SELECT COUNT(*) AS count FROM schedule`).get().count,
	};

	console.log("Data reset complete.");
	console.log(JSON.stringify(counts));
}

try {
	resetData();
} finally {
	db.close();
}
