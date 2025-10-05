const { ipcMain } = require('electron');
const { subjectQueries } = require('../db/queries');

// Handle add-subject request
ipcMain.on('add-subject', async (event, subject) => {
  try {
    // Validate input
    if (!subject.course_code || !subject.name) {
      event.reply('add-subject-response', {
        success: false,
        message: 'Course Code and Name are required'
      });
      return;
    }

    // Check if subject already exists
    const existingSubject = await subjectQueries.getSubjectByCode(subject.course_code);
    if (existingSubject) {
      event.reply('add-subject-response', {
        success: false,
        message: 'A subject with this Course Code already exists'
      });
      return;
    }

    // Add the subject
    await subjectQueries.addSubject(subject);
    event.reply('add-subject-response', {
      success: true,
      message: 'Subject added successfully'
    });
  } catch (error) {
    console.error('Error adding subject:', error);
    event.reply('add-subject-response', {
      success: false,
      message: `Error adding subject: ${error.message}`
    });
  }
});

// Handle get-subjects request
ipcMain.on('get-subjects', async (event) => {
  try {
    const subjects = await subjectQueries.getAllSubjects();
    event.reply('get-subjects-response', {
      success: true,
      data: subjects
    });
  } catch (error) {
    console.error('Error getting subjects:', error);
    event.reply('get-subjects-response', {
      success: false,
      message: `Error getting subjects: ${error.message}`
    });
  }
});

// Handle get-subject-by-code request
ipcMain.on('get-subject-by-code', async (event, code) => {
  try {
    const subject = await subjectQueries.getSubjectByCode(code);
    if (subject) {
      event.reply('get-subject-by-code-response', {
        success: true,
        data: subject
      });
    } else {
      event.reply('get-subject-by-code-response', {
        success: false,
        message: 'Subject not found'
      });
    }
  } catch (error) {
    console.error('Error getting subject:', error);
    event.reply('get-subject-by-code-response', {
      success: false,
      message: `Error getting subject: ${error.message}`
    });
  }
});

// Handle update-subject request
ipcMain.on('update-subject', async (event, subject) => {
  try {
    // Validate input
    if (!subject.course_code || !subject.name) {
      event.reply('update-subject-response', {
        success: false,
        message: 'Course Code and Name are required'
      });
      return;
    }

    // Check if subject exists
    const existingSubject = await subjectQueries.getSubjectByCode(subject.course_code);
    if (!existingSubject) {
      event.reply('update-subject-response', {
        success: false,
        message: 'Subject not found'
      });
      return;
    }

    // Update the subject
    await subjectQueries.updateSubject(subject);
    event.reply('update-subject-response', {
      success: true,
      message: 'Subject updated successfully'
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    event.reply('update-subject-response', {
      success: false,
      message: `Error updating subject: ${error.message}`
    });
  }
});

// Handle delete-subject request
ipcMain.on('delete-subject', async (event, code) => {
  try {
    // Check if subject exists
    const existingSubject = await subjectQueries.getSubjectByCode(code);
    if (!existingSubject) {
      event.reply('delete-subject-response', {
        success: false,
        message: 'Subject not found'
      });
      return;
    }

    // Delete the subject
    await subjectQueries.deleteSubject(code);
    event.reply('delete-subject-response', {
      success: true,
      message: 'Subject deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    event.reply('delete-subject-response', {
      success: false,
      message: `Error deleting subject: ${error.message}`
    });
  }
});

console.log('Subject IPC handlers registered');