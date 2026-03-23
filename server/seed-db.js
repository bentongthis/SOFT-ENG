const crypto = require("crypto");
const Database = require("better-sqlite3");

const db = new Database("school.db");

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Create sample users (teachers and students)
const teachers = [
  { name: "Dr. Maria Santos", email: "maria@school.local", password: "teacher1", role: "teacher" },
  { name: "Prof. John Smith", email: "john@school.local", password: "teacher2", role: "teacher" },
  { name: "Engr. Lisa Garcia", email: "lisa@school.local", password: "teacher3", role: "teacher" },
  { name: "Dr. Carlos Mendoza", email: "carlos@school.local", password: "teacher4", role: "teacher" },
];

const students = [
  { name: "Juan Dela Cruz", email: "juan@school.local", password: "student1", role: "student" },
  { name: "Maria Santos Jr.", email: "maria.jr@school.local", password: "student2", role: "student" },
  { name: "Pedro Reyes", email: "pedro@school.local", password: "student3", role: "student" },
];

// Create sample subjects
const subjects = [
  { code: "CS101", name: "Introduction to Computer Science", units: 3 },
  { code: "CS201", name: "Data Structures", units: 3 },
  { code: "CS301", name: "Database Management Systems", units: 4 },
  { code: "MATH101", name: "Calculus I", units: 3 },
  { code: "ENG101", name: "English Composition", units: 3 },
];

// Create sample rooms
const rooms = [
  { room_code: "LAB-101", building: "Science Building", capacity: 40 },
  { room_code: "LAB-102", building: "Science Building", capacity: 40 },
  { room_code: "ROOM-201", building: "Academic Building", capacity: 50 },
  { room_code: "ROOM-202", building: "Academic Building", capacity: 50 },
  { room_code: "ROOM-301", building: "Engineering Building", capacity: 45 },
];

console.log("Inserting teachers...");
const teacherIds = [];
for (const teacher of teachers) {
  try {
    const existing = db.prepare('SELECT id FROM "user" WHERE email = ?').get(teacher.email);
    if (!existing) {
      const info = db
        .prepare('INSERT INTO "user" (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
        .run(teacher.name, teacher.email, hashPassword(teacher.password), teacher.role);
      teacherIds.push(Number(info.lastInsertRowid));
      console.log(`✓ Created teacher: ${teacher.name}`);
    } else {
      teacherIds.push(existing.id);
      console.log(`✓ Teacher exists: ${teacher.name}`);
    }
  } catch (err) {
    console.error(`✗ Failed to create teacher ${teacher.name}:`, err.message);
  }
}

console.log("\nInserting students...");
for (const student of students) {
  try {
    const existing = db.prepare('SELECT id FROM "user" WHERE email = ?').get(student.email);
    if (!existing) {
      db.prepare('INSERT INTO "user" (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
        .run(student.name, student.email, hashPassword(student.password), student.role);
      console.log(`✓ Created student: ${student.name}`);
    } else {
      console.log(`✓ Student exists: ${student.name}`);
    }
  } catch (err) {
    console.error(`✗ Failed to create student ${student.name}:`, err.message);
  }
}

console.log("\nInserting subjects...");
const subjectIds = [];
for (const subject of subjects) {
  try {
    const existing = db.prepare("SELECT id FROM subject WHERE code = ?").get(subject.code);
    if (!existing) {
      const info = db
        .prepare("INSERT INTO subject (code, name, units) VALUES (?, ?, ?)")
        .run(subject.code, subject.name, subject.units);
      subjectIds.push(Number(info.lastInsertRowid));
      console.log(`✓ Created subject: ${subject.code}`);
    } else {
      subjectIds.push(existing.id);
      console.log(`✓ Subject exists: ${subject.code}`);
    }
  } catch (err) {
    console.error(`✗ Failed to create subject ${subject.code}:`, err.message);
  }
}

console.log("\nInserting rooms...");
const roomIds = [];
for (const room of rooms) {
  try {
    const existing = db.prepare("SELECT id FROM room WHERE room_code = ?").get(room.room_code);
    if (!existing) {
      const info = db
        .prepare("INSERT INTO room (room_code, building, capacity) VALUES (?, ?, ?)")
        .run(room.room_code, room.building, room.capacity);
      roomIds.push(Number(info.lastInsertRowid));
      console.log(`✓ Created room: ${room.room_code}`);
    } else {
      roomIds.push(existing.id);
      console.log(`✓ Room exists: ${room.room_code}`);
    }
  } catch (err) {
    console.error(`✗ Failed to create room ${room.room_code}:`, err.message);
  }
}

// Create sample schedules
console.log("\nInserting schedules...");
const scheduleData = [
  { subject_id: 1, teacher_id: teacherIds[0], room_id: 1, section: "BSIT-1A", day: "Monday", time_start: "07:30", time_end: "09:00" },
  { subject_id: 2, teacher_id: teacherIds[1], room_id: 2, section: "BSIT-1A", day: "Monday", time_start: "09:30", time_end: "11:00" },
  { subject_id: 3, teacher_id: teacherIds[2], room_id: 3, section: "BSIT-1A", day: "Tuesday", time_start: "07:30", time_end: "09:00" },
  { subject_id: 4, teacher_id: teacherIds[0], room_id: 4, section: "BSIT-2A", day: "Wednesday", time_start: "10:00", time_end: "11:30" },
  { subject_id: 5, teacher_id: teacherIds[1], room_id: 5, section: "BSIT-2A", day: "Thursday", time_start: "13:00", time_end: "14:30" },
  { subject_id: 1, teacher_id: teacherIds[2], room_id: 1, section: "BSIT-1B", day: "Friday", time_start: "07:30", time_end: "09:00" },
];

for (const schedule of scheduleData) {
  try {
    db.prepare(
      `INSERT INTO schedule (subject_id, teacher_id, room_id, section, day, time_start, time_end)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      schedule.subject_id,
      schedule.teacher_id,
      schedule.room_id,
      schedule.section,
      schedule.day,
      schedule.time_start,
      schedule.time_end
    );
    console.log(`✓ Created schedule: ${schedule.section} - ${schedule.day}`);
  } catch (err) {
    console.error(`✗ Failed to create schedule:`, err.message);
  }
}

console.log("\n✅ Database seeding complete!");
