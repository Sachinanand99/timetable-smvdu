const { ipcMain } = require('electron');
const { classQueries, classSubjectsQueries, classTeachersQueries } = require('../db/queries');

// Handle add-class request
ipcMain.on('add-class', async (event, classData) => {
  try {
    // Validate input
    if (!classData.semester || !classData.branch || !classData.section) {
      event.reply('add-class-response', {
        success: false,
        message: 'Semester, Branch, and Section are required'
      });
      return;
    }

    // Check if class already exists
    const existingClass = await classQueries.getClass(
      classData.semester,
      classData.branch,
      classData.section
    );
    
    if (existingClass) {
      event.reply('add-class-response', {
        success: false,
        message: 'This class already exists'
      });
      return;
    }

    // Add the class
    await classQueries.addClass(classData);
    event.reply('add-class-response', {
      success: true,
      message: 'Class added successfully'
    });
  } catch (error) {
    console.error('Error adding class:', error);
    event.reply('add-class-response', {
      success: false,
      message: `Error adding class: ${error.message}`
    });
  }
});

// Handle get-classes request
ipcMain.on('get-classes', async (event) => {
  try {
    const classes = await classQueries.getAllClasses();
    event.reply('get-classes-response', {
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('Error getting classes:', error);
    event.reply('get-classes-response', {
      success: false,
      message: `Error getting classes: ${error.message}`
    });
  }
});

// Handle get-classes-by-semester request
ipcMain.on('get-classes-by-semester', async (event, semester) => {
  try {
    const classes = await classQueries.getClassesBySemester(semester);
    event.reply('get-classes-by-semester-response', {
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('Error getting classes by semester:', error);
    event.reply('get-classes-by-semester-response', {
      success: false,
      message: `Error getting classes by semester: ${error.message}`
    });
  }
});

// Handle get-class request
ipcMain.on('get-class', async (event, { semester, branch, section }) => {
  try {
    const classData = await classQueries.getClass(semester, branch, section);
    if (classData) {
      event.reply('get-class-response', {
        success: true,
        data: classData
      });
    } else {
      event.reply('get-class-response', {
        success: false,
        message: 'Class not found'
      });
    }
  } catch (error) {
    console.error('Error getting class:', error);
    event.reply('get-class-response', {
      success: false,
      message: `Error getting class: ${error.message}`
    });
  }
});

// Handle update-class request
ipcMain.on('update-class', async (event, { oldData, newData }) => {
  try {
    // Validate input
    if (!oldData.semester || !oldData.branch || !oldData.section ||
        !newData.semester || !newData.branch || !newData.section) {
      event.reply('update-class-response', {
        success: false,
        message: 'Semester, Branch, and Section are required for both old and new data'
      });
      return;
    }

    // Check if old class exists
    const existingClass = await classQueries.getClass(
      oldData.semester,
      oldData.branch,
      oldData.section
    );
    
    if (!existingClass) {
      event.reply('update-class-response', {
        success: false,
        message: 'Class not found'
      });
      return;
    }

    // Check if new class already exists (if different from old)
    if (oldData.semester !== newData.semester || 
        oldData.branch !== newData.branch || 
        oldData.section !== newData.section) {
      
      const newClassExists = await classQueries.getClass(
        newData.semester,
        newData.branch,
        newData.section
      );
      
      if (newClassExists) {
        event.reply('update-class-response', {
          success: false,
          message: 'A class with the new details already exists'
        });
        return;
      }
    }

    // Update the class
    await classQueries.updateClass(oldData, newData);
    event.reply('update-class-response', {
      success: true,
      message: 'Class updated successfully'
    });
  } catch (error) {
    console.error('Error updating class:', error);
    event.reply('update-class-response', {
      success: false,
      message: `Error updating class: ${error.message}`
    });
  }
});

// Handle delete-class request
ipcMain.on('delete-class', async (event, { semester, branch, section }) => {
  try {
    // Check if class exists
    const existingClass = await classQueries.getClass(semester, branch, section);
    if (!existingClass) {
      event.reply('delete-class-response', {
        success: false,
        message: 'Class not found'
      });
      return;
    }

    // Delete the class
    await classQueries.deleteClass(semester, branch, section);
    event.reply('delete-class-response', {
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    event.reply('delete-class-response', {
      success: false,
      message: `Error deleting class: ${error.message}`
    });
  }
});

// Handle add-class-subject request
ipcMain.on('add-class-subject', async (event, data) => {
  try {
    // Validate input
    if (!data.semester || !data.branch || !data.section || !data.course_code) {
      event.reply('add-class-subject-response', {
        success: false,
        message: 'Semester, Branch, Section, and Course Code are required'
      });
      return;
    }

    // Add the subject to the class
    await classSubjectsQueries.addClassSubject(data);
    event.reply('add-class-subject-response', {
      success: true,
      message: 'Subject added to class successfully'
    });
  } catch (error) {
    console.error('Error adding subject to class:', error);
    event.reply('add-class-subject-response', {
      success: false,
      message: `Error adding subject to class: ${error.message}`
    });
  }
});

// Handle get-class-subjects request
ipcMain.on('get-class-subjects', async (event, { semester, branch, section }) => {
  try {
    const subjects = await classSubjectsQueries.getClassSubjects(semester, branch, section);
    event.reply('get-class-subjects-response', {
      success: true,
      data: subjects
    });
  } catch (error) {
    console.error('Error getting class subjects:', error);
    event.reply('get-class-subjects-response', {
      success: false,
      message: `Error getting class subjects: ${error.message}`
    });
  }
});

// Handle remove-class-subject request
ipcMain.on('remove-class-subject', async (event, { semester, branch, section, course_code }) => {
  try {
    await classSubjectsQueries.removeClassSubject(semester, branch, section, course_code);
    event.reply('remove-class-subject-response', {
      success: true,
      message: 'Subject removed from class successfully'
    });
  } catch (error) {
    console.error('Error removing subject from class:', error);
    event.reply('remove-class-subject-response', {
      success: false,
      message: `Error removing subject from class: ${error.message}`
    });
  }
});

// Handle add-class-teacher request
ipcMain.on('add-class-teacher', async (event, data) => {
  try {
    // Validate input
    if (!data.semester || !data.branch || !data.section || !data.teacher_id) {
      event.reply('add-class-teacher-response', {
        success: false,
        message: 'Semester, Branch, Section, and Teacher ID are required'
      });
      return;
    }

    // Add the teacher to the class
    await classTeachersQueries.addClassTeacher(data);
    event.reply('add-class-teacher-response', {
      success: true,
      message: 'Teacher added to class successfully'
    });
  } catch (error) {
    console.error('Error adding teacher to class:', error);
    event.reply('add-class-teacher-response', {
      success: false,
      message: `Error adding teacher to class: ${error.message}`
    });
  }
});

// Handle get-class-teachers request
ipcMain.on('get-class-teachers', async (event, { semester, branch, section }) => {
  try {
    const teachers = await classTeachersQueries.getClassTeachers(semester, branch, section);
    event.reply('get-class-teachers-response', {
      success: true,
      data: teachers
    });
  } catch (error) {
    console.error('Error getting class teachers:', error);
    event.reply('get-class-teachers-response', {
      success: false,
      message: `Error getting class teachers: ${error.message}`
    });
  }
});

// Handle remove-class-teacher request
ipcMain.on('remove-class-teacher', async (event, { semester, branch, section, teacher_id }) => {
  try {
    await classTeachersQueries.removeClassTeacher(semester, branch, section, teacher_id);
    event.reply('remove-class-teacher-response', {
      success: true,
      message: 'Teacher removed from class successfully'
    });
  } catch (error) {
    console.error('Error removing teacher from class:', error);
    event.reply('remove-class-teacher-response', {
      success: false,
      message: `Error removing teacher from class: ${error.message}`
    });
  }
});

console.log('Class IPC handlers registered');