const { ipcMain } = require('electron');
const { teacherQueries, teacherAvailabilityQueries } = require('../db/queries');

// Handle add-teacher request
ipcMain.on('add-teacher', async (event, teacher) => {
  try {
    // Validate input
    if (!teacher.id || !teacher.full_name) {
      event.reply('add-teacher-response', {
        success: false,
        message: 'Teacher ID and Full Name are required',
      });
      return;
    }

    // Check if teacher already exists
    const existingTeacher = await teacherQueries.getTeacherById(teacher.id);
    if (existingTeacher) {
      event.reply('add-teacher-response', {
        success: false,
        message: 'A teacher with this ID already exists',
      });
      return;
    }

    // Add the teacher
    await teacherQueries.addTeacher(teacher);
    event.reply('add-teacher-response', {
      success: true,
      message: 'Teacher added successfully',
    });
  } catch (error) {
    console.error('Error adding teacher:', error);
    event.reply('add-teacher-response', {
      success: false,
      message: `Error adding teacher: ${error.message}`,
    });
  }
});

// Handle get-teachers request
ipcMain.on('get-teachers', async (event) => {
  try {
    const teachers = await teacherQueries.getAllTeachers();
    event.reply('get-teachers-response', {
      success: true,
      data: teachers,
    });
  } catch (error) {
    console.error('Error getting teachers:', error);
    event.reply('get-teachers-response', {
      success: false,
      message: `Error getting teachers: ${error.message}`,
    });
  }
});

// Handle get-teacher-by-id request
ipcMain.on('get-teacher-by-id', async (event, id) => {
  try {
    const teacher = await teacherQueries.getTeacherById(id);
    if (teacher) {
      event.reply('get-teacher-by-id-response', {
        success: true,
        data: teacher,
      });
    } else {
      event.reply('get-teacher-by-id-response', {
        success: false,
        message: 'Teacher not found',
      });
    }
  } catch (error) {
    console.error('Error getting teacher:', error);
    event.reply('get-teacher-by-id-response', {
      success: false,
      message: `Error getting teacher: ${error.message}`,
    });
  }
});

// Handle update-teacher request
ipcMain.on('update-teacher', async (event, teacher) => {
  try {
    // Validate input
    if (!teacher.id || !teacher.full_name) {
      event.reply('update-teacher-response', {
        success: false,
        message: 'Teacher ID and Full Name are required',
      });
      return;
    }

    // Check if teacher exists
    const existingTeacher = await teacherQueries.getTeacherById(teacher.id);
    if (!existingTeacher) {
      event.reply('update-teacher-response', {
        success: false,
        message: 'Teacher not found',
      });
      return;
    }

    // Update the teacher
    await teacherQueries.updateTeacher(teacher);
    event.reply('update-teacher-response', {
      success: true,
      message: 'Teacher updated successfully',
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    event.reply('update-teacher-response', {
      success: false,
      message: `Error updating teacher: ${error.message}`,
    });
  }
});

// Handle delete-teacher request
ipcMain.on('delete-teacher', async (event, id) => {
  try {
    // Check if teacher exists
    const existingTeacher = await teacherQueries.getTeacherById(id);
    if (!existingTeacher) {
      event.reply('delete-teacher-response', {
        success: false,
        message: 'Teacher not found',
      });
      return;
    }

    // Delete the teacher
    await teacherQueries.deleteTeacher(id);
    event.reply('delete-teacher-response', {
      success: true,
      message: 'Teacher deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    event.reply('delete-teacher-response', {
      success: false,
      message: `Error deleting teacher: ${error.message}`,
    });
  }
});

// Handle teacher availability fetch
ipcMain.on('get-teacher-availability', async (event, teacherId) => {
  try {
    if (!teacherId) {
      event.reply('get-teacher-availability-response', {
        success: false,
        message: 'Teacher ID is required',
      });
      return;
    }

    const teacher = await teacherQueries.getTeacherById(teacherId);
    if (!teacher) {
      event.reply('get-teacher-availability-response', {
        success: false,
        message: 'Teacher not found',
      });
      return;
    }

    const data = await teacherAvailabilityQueries.getTeacherAvailability(
      teacherId
    );
    event.reply('get-teacher-availability-response', {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error getting teacher availability:', error);
    event.reply('get-teacher-availability-response', {
      success: false,
      message: `Error getting teacher availability: ${error.message}`,
    });
  }
});

// Handle teacher availability update
ipcMain.on('update-teacher-availability', async (event, payload) => {
  try {
    const { teacherId, slots } = payload || {};
    if (!teacherId) {
      event.reply('update-teacher-availability-response', {
        success: false,
        message: 'Teacher ID is required',
      });
      return;
    }

    const teacher = await teacherQueries.getTeacherById(teacherId);
    if (!teacher) {
      event.reply('update-teacher-availability-response', {
        success: false,
        message: 'Teacher not found',
      });
      return;
    }

    await teacherAvailabilityQueries.setTeacherAvailability(teacherId, slots);
    const data = await teacherAvailabilityQueries.getTeacherAvailability(
      teacherId
    );

    event.reply('update-teacher-availability-response', {
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error updating teacher availability:', error);
    event.reply('update-teacher-availability-response', {
      success: false,
      message: `Error updating teacher availability: ${error.message}`,
    });
  }
});

console.log('Teacher IPC handlers registered');
