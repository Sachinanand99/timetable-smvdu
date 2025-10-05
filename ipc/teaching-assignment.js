const { ipcMain } = require('electron');
const { teachingAssignmentQueries } = require('../db/queries');

// Handle add-teaching-assignment request
ipcMain.on('add-teaching-assignment', async (event, assignment) => {
  try {
    // Validate input
    if (!assignment.teacher_id || !assignment.course_code || 
        !assignment.semester || !assignment.branch || !assignment.section) {
      event.reply('add-teaching-assignment-response', {
        success: false,
        message: 'Teacher ID, Course Code, Semester, Branch, and Section are required'
      });
      return;
    }

    // Add the teaching assignment
    await teachingAssignmentQueries.addTeachingAssignment(assignment);
    event.reply('add-teaching-assignment-response', {
      success: true,
      message: 'Teaching assignment added successfully'
    });
  } catch (error) {
    console.error('Error adding teaching assignment:', error);
    event.reply('add-teaching-assignment-response', {
      success: false,
      message: `Error adding teaching assignment: ${error.message}`
    });
  }
});

// Handle get-teaching-assignments request
ipcMain.on('get-teaching-assignments', async (event) => {
  try {
    const assignments = await teachingAssignmentQueries.getAllTeachingAssignments();
    event.reply('get-teaching-assignments-response', {
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error getting teaching assignments:', error);
    event.reply('get-teaching-assignments-response', {
      success: false,
      message: `Error getting teaching assignments: ${error.message}`
    });
  }
});

// Handle get-teaching-assignments-by-teacher request
ipcMain.on('get-teaching-assignments-by-teacher', async (event, teacherId) => {
  try {
    const assignments = await teachingAssignmentQueries.getTeachingAssignmentsByTeacher(teacherId);
    event.reply('get-teaching-assignments-by-teacher-response', {
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error getting teaching assignments by teacher:', error);
    event.reply('get-teaching-assignments-by-teacher-response', {
      success: false,
      message: `Error getting teaching assignments by teacher: ${error.message}`
    });
  }
});

// Handle get-teaching-assignments-by-class request
ipcMain.on('get-teaching-assignments-by-class', async (event, { semester, branch, section }) => {
  try {
    const assignments = await teachingAssignmentQueries.getTeachingAssignmentsByClass(
      semester, branch, section
    );
    event.reply('get-teaching-assignments-by-class-response', {
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error getting teaching assignments by class:', error);
    event.reply('get-teaching-assignments-by-class-response', {
      success: false,
      message: `Error getting teaching assignments by class: ${error.message}`
    });
  }
});

// Handle delete-teaching-assignment request
ipcMain.on('delete-teaching-assignment', async (event, { teacher_id, course_code, semester, branch, section }) => {
  try {
    await teachingAssignmentQueries.deleteTeachingAssignment(
      teacher_id, course_code, semester, branch, section
    );
    event.reply('delete-teaching-assignment-response', {
      success: true,
      message: 'Teaching assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting teaching assignment:', error);
    event.reply('delete-teaching-assignment-response', {
      success: false,
      message: `Error deleting teaching assignment: ${error.message}`
    });
  }
});

console.log('Teaching Assignment IPC handlers registered');