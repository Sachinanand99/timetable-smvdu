const db = require('./schema');

function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

function getAllRows(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function getRow(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

const teacherQueries = {
  addTeacher: (teacher) => {
    return runQuery('INSERT INTO Teacher (id, full_name) VALUES (?, ?)', [
      teacher.id,
      teacher.full_name,
    ]);
  },

  getAllTeachers: () => {
    return getAllRows("SELECT * FROM Teacher ORDER BY printf('%05s', id)");
  },

  getTeacherById: (id) => {
    return getRow('SELECT * FROM Teacher WHERE id = ?', [id]);
  },

  updateTeacher: (teacher) => {
    return runQuery('UPDATE Teacher SET full_name = ? WHERE id = ?', [
      teacher.full_name,
      teacher.id,
    ]);
  },

  deleteTeacher: (id) => {
    return runQuery('DELETE FROM Teacher WHERE id = ?', [id]);
  },
};

const teacherAvailabilityQueries = {
  setTeacherAvailability: async (teacherId, slots = []) => {
    await runQuery('DELETE FROM Teacher_Unavailability WHERE teacher_id = ?', [
      teacherId,
    ]);

    if (!Array.isArray(slots) || slots.length === 0) {
      return;
    }

    const sanitizedSlots = slots
      .filter((slot) => slot && slot.day && slot.period !== undefined)
      .map((slot) => ({
        day: slot.day,
        period: Number(slot.period),
      }))
      .filter((slot) => Number.isInteger(slot.period));

    if (!sanitizedSlots.length) {
      return;
    }

    await Promise.all(
      sanitizedSlots.map((slot) =>
        runQuery(
          'INSERT INTO Teacher_Unavailability (teacher_id, day, period) VALUES (?, ?, ?)',
          [teacherId, slot.day, slot.period]
        )
      )
    );
  },

  getTeacherAvailability: (teacherId) => {
    return getAllRows(
      'SELECT day, period FROM Teacher_Unavailability WHERE teacher_id = ? ORDER BY day, period',
      [teacherId]
    );
  },

  getAllTeacherAvailability: () => {
    return getAllRows(
      'SELECT teacher_id, day, period FROM Teacher_Unavailability'
    );
  },
};

const subjectQueries = {
  addSubject: (subject) => {
    return runQuery(
      'INSERT INTO Subject (course_code, name, lecture_hr, theory_hr, practical_hr, credits, course_coordinator, display_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        subject.course_code,
        subject.name,
        subject.lecture_hr,
        subject.theory_hr,
        subject.practical_hr,
        subject.credits,
        subject.course_coordinator,
        subject.display_code,
      ]
    );
  },

  getAllSubjects: () => {
    return getAllRows('SELECT * FROM Subject ORDER BY name');
  },

  getSubjectByCode: (code) => {
    return getRow('SELECT * FROM Subject WHERE course_code = ?', [code]);
  },

  updateSubject: (subject) => {
    return runQuery(
      'UPDATE Subject SET name = ?, lecture_hr = ?, theory_hr = ?, practical_hr = ?, credits = ?, course_coordinator = ?, display_code = ? WHERE course_code = ?',
      [
        subject.name,
        subject.lecture_hr,
        subject.theory_hr,
        subject.practical_hr,
        subject.credits,
        subject.course_coordinator,
        subject.display_code,
        subject.course_code,
      ]
    );
  },

  deleteSubject: (code) => {
    return runQuery('DELETE FROM Subject WHERE course_code = ?', [code]);
  },
};

const classroomQueries = {
  addClassroom: (classroom) => {
    return runQuery(
      'INSERT INTO Classroom (room_id, capacity, type) VALUES (?, ?, ?)',
      [classroom.room_id, classroom.capacity, classroom.type]
    );
  },

  getAllClassrooms: () => {
    return getAllRows('SELECT * FROM Classroom ORDER BY room_id');
  },

  getClassroomsByType: (type) => {
    return getAllRows(
      'SELECT * FROM Classroom WHERE type = ? ORDER BY room_id',
      [type]
    );
  },

  getClassroomById: (id) => {
    return getRow('SELECT * FROM Classroom WHERE room_id = ?', [id]);
  },

  updateClassroom: (classroom) => {
    return runQuery(
      'UPDATE Classroom SET capacity = ?, type = ? WHERE room_id = ?',
      [classroom.capacity, classroom.type, classroom.room_id]
    );
  },

  deleteClassroom: (id) => {
    return runQuery('DELETE FROM Classroom WHERE room_id = ?', [id]);
  },
};

const classQueries = {
  addClass: (classData) => {
    return runQuery(
      'INSERT INTO Class (semester, branch, section, strength) VALUES (?, ?, ?, ?)',
      [
        classData.semester,
        classData.branch,
        classData.section,
        classData.strength,
      ]
    );
  },

  getAllClasses: () => {
    return getAllRows(
      'SELECT * FROM Class ORDER BY semester, branch, section, strength'
    );
  },

  getClassesBySemester: (semester) => {
    return getAllRows(
      'SELECT * FROM Class WHERE semester = ? ORDER BY branch, section, strength',
      [semester]
    );
  },

  getClass: (semester, branch, section, strength) => {
    return getRow(
      'SELECT * FROM Class WHERE semester = ? AND branch = ? AND section = ? AND strength = ?',
      [semester, branch, section, strength]
    );
  },

  updateClass: (oldData, newData) => {
    return runQuery(
      'UPDATE Class SET semester = ?, branch = ?, section = ?, strength = ? WHERE semester = ? AND branch = ? AND section = ?, strength = ?',
      [
        newData.semester,
        newData.branch,
        newData.section,
        newData.strength,
        oldData.semester,
        oldData.branch,
        oldData.section,
        oldData.strength,
      ]
    );
  },

  deleteClass: (semester, branch, section, strength) => {
    return runQuery(
      'DELETE FROM Class WHERE semester = ? AND branch = ? AND section = ? AND strength = ?',
      [semester, branch, section, strength]
    );
  },
};

const teachingAssignmentQueries = {
  addTeachingAssignment: (assignment) => {
    return runQuery(
      'INSERT INTO Teaching_Assignment (teacher_id, course_code, semester, branch, section) VALUES (?, ?, ?, ?, ?)',
      [
        assignment.teacher_id,
        assignment.course_code,
        assignment.semester,
        assignment.branch,
        assignment.section,
      ]
    );
  },

  getAllTeachingAssignments: () => {
    return getAllRows(`
      SELECT ta.*, t.full_name as teacher_name, s.name as subject_name
      FROM Teaching_Assignment ta
      JOIN Teacher t ON ta.teacher_id = t.id
      JOIN Subject s ON ta.course_code = s.course_code
      ORDER BY ta.semester, ta.branch, ta.section
    `);
  },

  getTeachingAssignmentsByTeacher: (teacherId) => {
    return getAllRows(
      `
      SELECT ta.*, t.full_name as teacher_name, s.name as subject_name
      FROM Teaching_Assignment ta
      JOIN Teacher t ON ta.teacher_id = t.id
      JOIN Subject s ON ta.course_code = s.course_code
      WHERE ta.teacher_id = ?
      ORDER BY ta.semester, ta.branch, ta.section
    `,
      [teacherId]
    );
  },

  getTeachingAssignmentsByClass: (semester, branch, section) => {
    return getAllRows(
      `
      SELECT ta.*, t.full_name as teacher_name, s.name as subject_name
      FROM Teaching_Assignment ta
      JOIN Teacher t ON ta.teacher_id = t.id
      JOIN Subject s ON ta.course_code = s.course_code
      WHERE ta.semester = ? AND ta.branch = ? AND ta.section = ?
      ORDER BY s.name
    `,
      [semester, branch, section]
    );
  },

  deleteTeachingAssignment: (
    teacher_id,
    course_code,
    semester,
    branch,
    section
  ) => {
    return runQuery(
      'DELETE FROM Teaching_Assignment WHERE teacher_id = ? AND course_code = ? AND semester = ? AND branch = ? AND section = ?',
      [teacher_id, course_code, semester, branch, section]
    );
  },
};

const classSubjectsQueries = {
  addClassSubject: (data) => {
    return runQuery(
      'INSERT INTO Class_Subjects (semester, branch, section, course_code) VALUES (?, ?, ?, ?)',
      [data.semester, data.branch, data.section, data.course_code]
    );
  },

  getClassSubjects: (semester, branch, section) => {
    return getAllRows(
      `
      SELECT cs.*, s.name, s.lecture_hr, s.theory_hr, s.practical_hr, s.credits, s.display_code
      FROM Class_Subjects cs
      JOIN Subject s ON cs.course_code = s.course_code
      WHERE cs.semester = ? AND cs.branch = ? AND cs.section = ?
      ORDER BY s.name
    `,
      [semester, branch, section]
    );
  },

  removeClassSubject: (semester, branch, section, course_code) => {
    return runQuery(
      'DELETE FROM Class_Subjects WHERE semester = ? AND branch = ? AND section = ? AND course_code = ?',
      [semester, branch, section, course_code]
    );
  },
};

const classTeachersQueries = {
  addClassTeacher: (data) => {
    return runQuery(
      'INSERT INTO Class_Teachers (semester, branch, section, teacher_id) VALUES (?, ?, ?, ?)',
      [data.semester, data.branch, data.section, data.teacher_id]
    );
  },

  getClassTeachers: (semester, branch, section) => {
    return getAllRows(
      `
      SELECT ct.*, t.full_name
      FROM Class_Teachers ct
      JOIN Teacher t ON ct.teacher_id = t.id
      WHERE ct.semester = ? AND ct.branch = ? AND ct.section = ?
      ORDER BY t.full_name
    `,
      [semester, branch, section]
    );
  },

  removeClassTeacher: (semester, branch, section, teacher_id) => {
    return runQuery(
      'DELETE FROM Class_Teachers WHERE semester = ? AND branch = ? AND section = ? AND teacher_id = ?',
      [semester, branch, section, teacher_id]
    );
  },
};

const timetableQueries = {
  saveTimetableEntry: (entry) => {
    return runQuery(
      'INSERT INTO Timetable (semester, branch, section, day, period, course_code, teacher_id, room_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        entry.semester,
        entry.branch,
        entry.section,
        entry.day,
        entry.period,
        entry.course_code,
        entry.teacher_id,
        entry.room_id,
      ]
    );
  },

  getClassTimetable: (semester, branch, section) => {
    return getAllRows(
      `
      SELECT t.*, s.name as subject_name, s.display_code, 
             tc.full_name as teacher_name, c.capacity, c.type as room_type
      FROM Timetable t
      JOIN Subject s ON t.course_code = s.course_code
      JOIN Teacher tc ON t.teacher_id = tc.id
      JOIN Classroom c ON t.room_id = c.room_id
      WHERE t.semester = ? AND t.branch = ? AND t.section = ?
      ORDER BY t.day, t.period
    `,
      [semester, branch, section]
    );
  },

  getTeacherTimetable: (teacherId) => {
    return getAllRows(
      `
      SELECT t.*, s.name as subject_name, s.display_code, 
             c.capacity, c.type as room_type
      FROM Timetable t
      JOIN Subject s ON t.course_code = s.course_code
      JOIN Classroom c ON t.room_id = c.room_id
      WHERE t.teacher_id = ?
      ORDER BY t.day, t.period
    `,
      [teacherId]
    );
  },

  getClassroomTimetable: (roomId) => {
    return getAllRows(
      `
      SELECT t.*, s.name as subject_name, s.display_code, 
             tc.full_name as teacher_name
      FROM Timetable t
      JOIN Subject s ON t.course_code = s.course_code
      JOIN Teacher tc ON t.teacher_id = tc.id
      WHERE t.room_id = ?
      ORDER BY t.day, t.period
    `,
      [roomId]
    );
  },

  clearClassTimetable: (semester, branch, section) => {
    return runQuery(
      'DELETE FROM Timetable WHERE semester = ? AND branch = ? AND section = ?',
      [semester, branch, section]
    );
  },

  clearAllTimetables: () => {
    return runQuery('DELETE FROM Timetable');
  },
};

module.exports = {
  teacherQueries,
  teacherAvailabilityQueries,
  subjectQueries,
  classroomQueries,
  classQueries,
  teachingAssignmentQueries,
  classSubjectsQueries,
  classTeachersQueries,
  timetableQueries,
};
