const db = require('./schema');

// Helper function to run a query with parameters
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Helper function to get all rows from a query
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

// Helper function to get a single row from a query
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

// Teacher queries
const teacherQueries = {
  // Add a new teacher
  addTeacher: (teacher) => {
    return runQuery(
      'INSERT INTO Teacher (id, full_name) VALUES (?, ?)',
      [teacher.id, teacher.full_name]
    );
  },
  
  // Get all teachers
  getAllTeachers: () => {
    return getAllRows('SELECT * FROM Teacher ORDER BY full_name');
  },
  
  // Get a teacher by ID
  getTeacherById: (id) => {
    return getRow('SELECT * FROM Teacher WHERE id = ?', [id]);
  },
  
  // Update a teacher
  updateTeacher: (teacher) => {
    return runQuery(
      'UPDATE Teacher SET full_name = ? WHERE id = ?',
      [teacher.full_name, teacher.id]
    );
  },
  
  // Delete a teacher
  deleteTeacher: (id) => {
    return runQuery('DELETE FROM Teacher WHERE id = ?', [id]);
  }
};

// Subject queries
const subjectQueries = {
  // Add a new subject
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
        subject.display_code
      ]
    );
  },
  
  // Get all subjects
  getAllSubjects: () => {
    return getAllRows('SELECT * FROM Subject ORDER BY name');
  },
  
  // Get a subject by course code
  getSubjectByCode: (code) => {
    return getRow('SELECT * FROM Subject WHERE course_code = ?', [code]);
  },
  
  // Update a subject
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
        subject.course_code
      ]
    );
  },
  
  // Delete a subject
  deleteSubject: (code) => {
    return runQuery('DELETE FROM Subject WHERE course_code = ?', [code]);
  }
};

// Classroom queries
const classroomQueries = {
  // Add a new classroom
  addClassroom: (classroom) => {
    return runQuery(
      'INSERT INTO Classroom (room_id, capacity, type) VALUES (?, ?, ?)',
      [classroom.room_id, classroom.capacity, classroom.type]
    );
  },
  
  // Get all classrooms
  getAllClassrooms: () => {
    return getAllRows('SELECT * FROM Classroom ORDER BY room_id');
  },
  
  // Get classrooms by type
  getClassroomsByType: (type) => {
    return getAllRows('SELECT * FROM Classroom WHERE type = ? ORDER BY room_id', [type]);
  },
  
  // Get a classroom by ID
  getClassroomById: (id) => {
    return getRow('SELECT * FROM Classroom WHERE room_id = ?', [id]);
  },
  
  // Update a classroom
  updateClassroom: (classroom) => {
    return runQuery(
      'UPDATE Classroom SET capacity = ?, type = ? WHERE room_id = ?',
      [classroom.capacity, classroom.type, classroom.room_id]
    );
  },
  
  // Delete a classroom
  deleteClassroom: (id) => {
    return runQuery('DELETE FROM Classroom WHERE room_id = ?', [id]);
  }
};

// Class queries
const classQueries = {
  // Add a new class
  addClass: (classData) => {
    return runQuery(
      'INSERT INTO Class (semester, branch, section) VALUES (?, ?, ?)',
      [classData.semester, classData.branch, classData.section]
    );
  },
  
  // Get all classes
  getAllClasses: () => {
    return getAllRows('SELECT * FROM Class ORDER BY semester, branch, section');
  },
  
  // Get classes by semester
  getClassesBySemester: (semester) => {
    return getAllRows('SELECT * FROM Class WHERE semester = ? ORDER BY branch, section', [semester]);
  },
  
  // Get a specific class
  getClass: (semester, branch, section) => {
    return getRow(
      'SELECT * FROM Class WHERE semester = ? AND branch = ? AND section = ?',
      [semester, branch, section]
    );
  },
  
  // Update a class
  updateClass: (oldData, newData) => {
    return runQuery(
      'UPDATE Class SET semester = ?, branch = ?, section = ? WHERE semester = ? AND branch = ? AND section = ?',
      [
        newData.semester,
        newData.branch,
        newData.section,
        oldData.semester,
        oldData.branch,
        oldData.section
      ]
    );
  },
  
  // Delete a class
  deleteClass: (semester, branch, section) => {
    return runQuery(
      'DELETE FROM Class WHERE semester = ? AND branch = ? AND section = ?',
      [semester, branch, section]
    );
  }
};

// Teaching Assignment queries
const teachingAssignmentQueries = {
  // Add a new teaching assignment
  addTeachingAssignment: (assignment) => {
    return runQuery(
      'INSERT INTO Teaching_Assignment (teacher_id, course_code, semester, branch, section) VALUES (?, ?, ?, ?, ?)',
      [
        assignment.teacher_id,
        assignment.course_code,
        assignment.semester,
        assignment.branch,
        assignment.section
      ]
    );
  },
  
  // Get all teaching assignments
  getAllTeachingAssignments: () => {
    return getAllRows(`
      SELECT ta.*, t.full_name as teacher_name, s.name as subject_name
      FROM Teaching_Assignment ta
      JOIN Teacher t ON ta.teacher_id = t.id
      JOIN Subject s ON ta.course_code = s.course_code
      ORDER BY ta.semester, ta.branch, ta.section
    `);
  },
  
  // Get teaching assignments by teacher
  getTeachingAssignmentsByTeacher: (teacherId) => {
    return getAllRows(`
      SELECT ta.*, t.full_name as teacher_name, s.name as subject_name
      FROM Teaching_Assignment ta
      JOIN Teacher t ON ta.teacher_id = t.id
      JOIN Subject s ON ta.course_code = s.course_code
      WHERE ta.teacher_id = ?
      ORDER BY ta.semester, ta.branch, ta.section
    `, [teacherId]);
  },
  
  // Get teaching assignments by class
  getTeachingAssignmentsByClass: (semester, branch, section) => {
    return getAllRows(`
      SELECT ta.*, t.full_name as teacher_name, s.name as subject_name
      FROM Teaching_Assignment ta
      JOIN Teacher t ON ta.teacher_id = t.id
      JOIN Subject s ON ta.course_code = s.course_code
      WHERE ta.semester = ? AND ta.branch = ? AND ta.section = ?
      ORDER BY s.name
    `, [semester, branch, section]);
  },
  
  // Delete a teaching assignment
  deleteTeachingAssignment: (teacher_id, course_code, semester, branch, section) => {
    return runQuery(
      'DELETE FROM Teaching_Assignment WHERE teacher_id = ? AND course_code = ? AND semester = ? AND branch = ? AND section = ?',
      [teacher_id, course_code, semester, branch, section]
    );
  }
};

// Class Subjects queries
const classSubjectsQueries = {
  // Add a subject to a class
  addClassSubject: (data) => {
    return runQuery(
      'INSERT INTO Class_Subjects (semester, branch, section, course_code) VALUES (?, ?, ?, ?)',
      [data.semester, data.branch, data.section, data.course_code]
    );
  },
  
  // Get all subjects for a class
  getClassSubjects: (semester, branch, section) => {
    return getAllRows(`
      SELECT cs.*, s.name, s.lecture_hr, s.theory_hr, s.practical_hr, s.credits, s.display_code
      FROM Class_Subjects cs
      JOIN Subject s ON cs.course_code = s.course_code
      WHERE cs.semester = ? AND cs.branch = ? AND cs.section = ?
      ORDER BY s.name
    `, [semester, branch, section]);
  },
  
  // Remove a subject from a class
  removeClassSubject: (semester, branch, section, course_code) => {
    return runQuery(
      'DELETE FROM Class_Subjects WHERE semester = ? AND branch = ? AND section = ? AND course_code = ?',
      [semester, branch, section, course_code]
    );
  }
};

// Class Teachers queries
const classTeachersQueries = {
  // Add a teacher to a class
  addClassTeacher: (data) => {
    return runQuery(
      'INSERT INTO Class_Teachers (semester, branch, section, teacher_id) VALUES (?, ?, ?, ?)',
      [data.semester, data.branch, data.section, data.teacher_id]
    );
  },
  
  // Get all teachers for a class
  getClassTeachers: (semester, branch, section) => {
    return getAllRows(`
      SELECT ct.*, t.full_name
      FROM Class_Teachers ct
      JOIN Teacher t ON ct.teacher_id = t.id
      WHERE ct.semester = ? AND ct.branch = ? AND ct.section = ?
      ORDER BY t.full_name
    `, [semester, branch, section]);
  },
  
  // Remove a teacher from a class
  removeClassTeacher: (semester, branch, section, teacher_id) => {
    return runQuery(
      'DELETE FROM Class_Teachers WHERE semester = ? AND branch = ? AND section = ? AND teacher_id = ?',
      [semester, branch, section, teacher_id]
    );
  }
};

// Timetable queries
const timetableQueries = {
  // Save a timetable entry
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
        entry.room_id
      ]
    );
  },
  
  // Get timetable for a class
  getClassTimetable: (semester, branch, section) => {
    return getAllRows(`
      SELECT t.*, s.name as subject_name, s.display_code, 
             tc.full_name as teacher_name, c.capacity, c.type as room_type
      FROM Timetable t
      JOIN Subject s ON t.course_code = s.course_code
      JOIN Teacher tc ON t.teacher_id = tc.id
      JOIN Classroom c ON t.room_id = c.room_id
      WHERE t.semester = ? AND t.branch = ? AND t.section = ?
      ORDER BY t.day, t.period
    `, [semester, branch, section]);
  },
  
  // Get timetable for a teacher
  getTeacherTimetable: (teacherId) => {
    return getAllRows(`
      SELECT t.*, s.name as subject_name, s.display_code, 
             c.capacity, c.type as room_type
      FROM Timetable t
      JOIN Subject s ON t.course_code = s.course_code
      JOIN Classroom c ON t.room_id = c.room_id
      WHERE t.teacher_id = ?
      ORDER BY t.day, t.period
    `, [teacherId]);
  },
  
  // Get timetable for a classroom
  getClassroomTimetable: (roomId) => {
    return getAllRows(`
      SELECT t.*, s.name as subject_name, s.display_code, 
             tc.full_name as teacher_name
      FROM Timetable t
      JOIN Subject s ON t.course_code = s.course_code
      JOIN Teacher tc ON t.teacher_id = tc.id
      WHERE t.room_id = ?
      ORDER BY t.day, t.period
    `, [roomId]);
  },
  
  // Clear timetable for a class
  clearClassTimetable: (semester, branch, section) => {
    return runQuery(
      'DELETE FROM Timetable WHERE semester = ? AND branch = ? AND section = ?',
      [semester, branch, section]
    );
  },
  
  // Clear all timetables
  clearAllTimetables: () => {
    return runQuery('DELETE FROM Timetable');
  }
};

module.exports = {
  teacherQueries,
  subjectQueries,
  classroomQueries,
  classQueries,
  teachingAssignmentQueries,
  classSubjectsQueries,
  classTeachersQueries,
  timetableQueries
};