const { ipcMain } = require('electron');
const {
  subjectQueries,
  classQueries,
  classroomQueries,
} = require('../db/queries');

// Handle add-classroom request
ipcMain.on('add-classroom', async (event, classroom) => {
  try {
    // Validate input
    if (!classroom.room_id || !classroom.capacity || !classroom.type) {
      event.reply('add-classroom-response', {
        success: false,
        message: 'Room ID, Capacity, and Type are required'
      });
      return;
    }

    // Validate classroom type
    if (classroom.type !== 'lab' && classroom.type !== 'lecture') {
      event.reply('add-classroom-response', {
        success: false,
        message: 'Classroom type must be either "lab" or "lecture"'
      });
      return;
    }

    // Check if classroom already exists
    const existingClassroom = await classroomQueries.getClassroomById(classroom.room_id);
    if (existingClassroom) {
      event.reply('add-classroom-response', {
        success: false,
        message: 'A classroom with this Room ID already exists'
      });
      return;
    }

    // Add the classroom
    await classroomQueries.addClassroom(classroom);
    event.reply('add-classroom-response', {
      success: true,
      message: 'Classroom added successfully'
    });
  } catch (error) {
    console.error('Error adding classroom:', error);
    event.reply('add-classroom-response', {
      success: false,
      message: `Error adding classroom: ${error.message}`
    });
  }
});

// Handle get-classrooms request
ipcMain.on('get-classrooms', async (event) => {
  try {
    const classrooms = await classroomQueries.getAllClassrooms();
    event.reply('get-classrooms-response', {
      success: true,
      data: classrooms
    });
  } catch (error) {
    console.error('Error getting classrooms:', error);
    event.reply('get-classrooms-response', {
      success: false,
      message: `Error getting classrooms: ${error.message}`
    });
  }
});

// Handle get-classrooms-by-type request
ipcMain.on('get-classrooms-by-type', async (event, type) => {
  try {
    // Validate classroom type
    if (type !== 'lab' && type !== 'lecture') {
      event.reply('get-classrooms-by-type-response', {
        success: false,
        message: 'Classroom type must be either "lab" or "lecture"'
      });
      return;
    }

    const classrooms = await classroomQueries.getClassroomsByType(type);
    event.reply('get-classrooms-by-type-response', {
      success: true,
      data: classrooms
    });
  } catch (error) {
    console.error('Error getting classrooms by type:', error);
    event.reply('get-classrooms-by-type-response', {
      success: false,
      message: `Error getting classrooms by type: ${error.message}`
    });
  }
});

// Handle get-classroom-by-id request
ipcMain.on('get-classroom-by-id', async (event, id) => {
  try {
    const classroom = await classroomQueries.getClassroomById(id);
    if (classroom) {
      event.reply('get-classroom-by-id-response', {
        success: true,
        data: classroom
      });
    } else {
      event.reply('get-classroom-by-id-response', {
        success: false,
        message: 'Classroom not found'
      });
    }
  } catch (error) {
    console.error('Error getting classroom:', error);
    event.reply('get-classroom-by-id-response', {
      success: false,
      message: `Error getting classroom: ${error.message}`
    });
  }
});

// Handle update-classroom request
ipcMain.on('update-classroom', async (event, classroom) => {
  try {
    // Validate input
    if (!classroom.room_id || !classroom.capacity || !classroom.type) {
      event.reply('update-classroom-response', {
        success: false,
        message: 'Room ID, Capacity, and Type are required'
      });
      return;
    }

    // Validate classroom type
    if (classroom.type !== 'lab' && classroom.type !== 'lecture') {
      event.reply('update-classroom-response', {
        success: false,
        message: 'Classroom type must be either "lab" or "lecture"'
      });
      return;
    }

    // Check if classroom exists
    const existingClassroom = await classroomQueries.getClassroomById(classroom.room_id);
    if (!existingClassroom) {
      event.reply('update-classroom-response', {
        success: false,
        message: 'Classroom not found'
      });
      return;
    }

    // Update the classroom
    await classroomQueries.updateClassroom(classroom);
    event.reply('update-classroom-response', {
      success: true,
      message: 'Classroom updated successfully'
    });
  } catch (error) {
    console.error('Error updating classroom:', error);
    event.reply('update-classroom-response', {
      success: false,
      message: `Error updating classroom: ${error.message}`
    });
  }
});

// Handle delete-classroom request
ipcMain.on('delete-classroom', async (event, id) => {
  try {
    // Check if classroom exists
    const existingClassroom = await classroomQueries.getClassroomById(id);
    if (!existingClassroom) {
      event.reply('delete-classroom-response', {
        success: false,
        message: 'Classroom not found'
      });
      return;
    }

    // Delete the classroom
    await classroomQueries.deleteClassroom(id);
    event.reply('delete-classroom-response', {
      success: true,
      message: 'Classroom deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting classroom:', error);
    event.reply('delete-classroom-response', {
      success: false,
      message: `Error deleting classroom: ${error.message}`
    });
  }
});

ipcMain.on('assign-lab-to-subject', async (event, { course_code, room_id }) => {
  try {
    // Validate input
    if (!course_code || !room_id) {
      event.reply('assign-lab-to-subject-response', {
        success: false,
        message: 'Course code and lab room ID are required',
      });
      return;
    }

    // Validate subject
    const subject = await subjectQueries.getSubjectByCode(course_code);
    if (!subject) {
      event.reply('assign-lab-to-subject-response', {
        success: false,
        message: `Subject not found: ${course_code}`,
      });
      return;
    }

    // Validate classroom (must be a lab)
    const classroom = await classroomQueries.getClassroomById(room_id);
    if (!classroom) {
      event.reply('assign-lab-to-subject-response', {
        success: false,
        message: `Lab room not found: ${room_id}`,
      });
      return;
    }
    if (classroom.type !== 'lab') {
      event.reply('assign-lab-to-subject-response', {
        success: false,
        message: `Room ${room_id} is not a lab`,
      });
      return;
    }

    // Update
    await classroomQueries.assignLabToSubject(course_code, room_id);
    const updated = await subjectQueries.getSubjectByCode(course_code);

    event.reply('assign-lab-to-subject-response', {
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error('Error assigning lab to subject:', err);
    event.reply('assign-lab-to-subject-response', {
      success: false,
      message: err.message,
    });
  }
});

ipcMain.on(
  'assign-classroom-to-class',
  async (event, { semester, branch, section, room_id }) => {
    try {
      if (!semester || !branch || !section || !room_id) {
        event.reply('assign-classroom-to-class-response', {
          success: false,
          message: 'Semester, branch, section, and room ID are required',
        });
        return;
      }

      const klass = await classQueries.getClassByKey(semester, branch, section); // implement this in classQueries
      if (!klass) {
        event.reply('assign-classroom-to-class-response', {
          success: false,
          message: `Class not found: ${semester}-${branch}-${section}`,
        });
        return;
      }

      const classroom = await classroomQueries.getClassroomById(room_id);
      if (!classroom) {
        event.reply('assign-classroom-to-class-response', {
          success: false,
          message: `Classroom not found: ${room_id}`,
        });
        return;
      }
      if (classroom.type !== 'lecture') {
        event.reply('assign-classroom-to-class-response', {
          success: false,
          message: `Room ${room_id} is not a lecture room`,
        });
        return;
      }

      await classroomQueries.assignClassroomToClass(
        semester,
        branch,
        section,
        room_id
      );
      const updated = await classQueries.getClassByKey(
        semester,
        branch,
        section
      );

      event.reply('assign-classroom-to-class-response', {
        success: true,
        data: updated,
      });
    } catch (err) {
      console.error('Error assigning classroom to class:', err);
      event.reply('assign-classroom-to-class-response', {
        success: false,
        message: err.message,
      });
    }
  }
);

ipcMain.on('delete-lab-assignment', async (event, course_code) => {
  try {
    await classroomQueries.assignLabToSubject(course_code, null); // set lab_room_id to null
    event.reply('delete-lab-assignment-response', { success: true });
  } catch (err) {
    event.reply('delete-lab-assignment-response', {
      success: false,
      message: err.message,
    });
  }
});

console.log('Classroom IPC handlers registered');