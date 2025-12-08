export function attachLogic(ipcRenderer) {
  let allClasses = [];
  let allTeachers = [];
  let allClassrooms = [];
  let currentTimetable = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [1, 2, 3, 4, 5, 6, 7];
  const timeSlots = [
    '9 am - 10 am',
    '10 am - 11 am',
    '11 am - 12 pm',
    '12 pm - 1 pm',
    '2 pm - 3 pm',
    '3 pm - 4 pm',
    '4 pm - 5 pm',
  ];

  // DOM references
  const viewTypeSelect = document.getElementById('view-type');
  const viewClassSelect = document.getElementById('view-class');
  const viewTeacherSelect = document.getElementById('view-teacher');
  const viewClassroomSelect = document.getElementById('view-classroom');
  const timetableTitle = document.getElementById('timetable-title');
  const timetableContainer = document.getElementById('timetable-container');
  const timetableBody = document.querySelector('#timetable tbody');
  const loadingSpinner = document.getElementById('loading-spinner');
  const generateAllBtn = document.getElementById('generate-all-btn');
  const clearAllBtn = document.getElementById('clear-all-btn');
  const statusLog = document.getElementById('status-log');

  // Initial load
  loadInitialData();

  function loadInitialData() {
    ipcRenderer.send('get-classes');
    ipcRenderer.send('get-teachers');
    ipcRenderer.send('get-classrooms');
  }

  ipcRenderer.on('get-classes-response', (event, res) => {
    if (res.success) {
      allClasses = res.data;

      if (viewClassSelect) {
        viewClassSelect.innerHTML = '<option value="">Select Class</option>';
        allClasses.forEach((c) => {
          const label = `${c.semester} - ${c.branch} - ${c.section}`;
          const value = `${c.semester}|${c.branch}|${c.section}`;
          viewClassSelect.innerHTML += `<option value="${value}">${label}</option>`;
        });
      }
    }
  });

  const generateReportBtn = document.getElementById('generate-report-btn');

  if (generateReportBtn) {
    generateReportBtn.addEventListener('click', () => {
      showToast('Generating reports...', 'info');
      ipcRenderer.send('generate-reports');
    });
  }

  ipcRenderer.on('generate-reports-response', (event, res) => {
    if (res.success) {
      showToast('Reports generated successfully', 'success');
      logStatus(res.message);
    } else {
      showToast('Error: ' + res.message, 'danger');
      logStatus(res.message);
    }
  });

  ipcRenderer.on('get-teachers-response', (event, res) => {
    if (res.success) {
      allTeachers = res.data;
      if (viewTeacherSelect) {
        viewTeacherSelect.innerHTML =
          '<option value="">Select Teacher</option>';
        allTeachers.forEach((t) => {
          viewTeacherSelect.innerHTML += `<option value="${t.id}">${t.full_name} (${t.id})</option>`;
        });
      }
    }
  });

  ipcRenderer.on('get-classrooms-response', (event, res) => {
    if (res.success) {
      allClassrooms = res.data;
      if (viewClassroomSelect) {
        viewClassroomSelect.innerHTML =
          '<option value="">Select Classroom</option>';
        allClassrooms.forEach((c) => {
          const label = `${c.room_id} (${
            c.type === 'lab' ? 'Lab' : 'Lecture'
          }, Capacity: ${c.capacity})`;
          viewClassroomSelect.innerHTML += `<option value="${c.room_id}">${label}</option>`;
        });
      }
    }
  });

  // Simple toast notification function
  function showToast(message, type = 'info') {
    // Check if toast container exists, create if not
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.position = 'fixed';
      toastContainer.style.top = '20px';
      toastContainer.style.right = '20px';
      toastContainer.style.zIndex = '9999';
      document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `alert alert-${type}`;
    toast.role = 'alert';
    toast.innerHTML = message;
    toast.style.marginBottom = '10px';
    toastContainer.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s';
      setTimeout(() => {
        toastContainer.removeChild(toast);
      }, 500);
    }, 3000);
  }

  if (viewTypeSelect) {
    viewTypeSelect.addEventListener('change', () => {
      const type = viewTypeSelect.value;
      const classContainer = document.getElementById('view-class-container');
      const teacherContainer = document.getElementById(
        'view-teacher-container'
      );
      const classroomContainer = document.getElementById(
        'view-classroom-container'
      );

      if (classContainer) {
        classContainer.style.display = type === 'class' ? 'block' : 'none';
      }
      if (teacherContainer) {
        teacherContainer.style.display = type === 'teacher' ? 'block' : 'none';
      }
      if (classroomContainer) {
        classroomContainer.style.display =
          type === 'classroom' ? 'block' : 'none';
      }
    });
  }

  const viewForm = document.getElementById('view-form');
  if (viewForm) {
    viewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!viewTypeSelect) return;

      const type = viewTypeSelect.value;
      if (type === 'class' && viewClassSelect) {
        const value = viewClassSelect.value;
        if (!value) return showToast('Please select a class', 'info');
        const [semester, branch, section] = value.split('|');
        ipcRenderer.send('get-class-timetable', { semester, branch, section });
      } else if (type === 'teacher' && viewTeacherSelect) {
        const teacherId = viewTeacherSelect.value;
        if (!teacherId) return showToast('Please select a teacher', 'info');
        ipcRenderer.send('get-teacher-timetable', teacherId);
      } else if (type === 'classroom' && viewClassroomSelect) {
        const roomId = viewClassroomSelect.value;
        if (!roomId) return showToast('Please select a classroom', 'info');
        ipcRenderer.send('get-classroom-timetable', roomId);
      }
    });
  }

  if (generateAllBtn) {
    generateAllBtn.addEventListener('click', () => {
      if (statusLog) {
        statusLog.innerHTML = '';
        logStatus('Starting generation for all classes...');
      }
      setLoading(true);
      ipcRenderer.send('generate-all-timetables');
    });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      if (statusLog) {
        statusLog.innerHTML = '';
        logStatus('Clearing all timetables...');
      }
      setLoading(true);
      ipcRenderer.send('clear-all-timetables');
    });
  }

  ipcRenderer.on('generate-all-timetables-progress', (event, payload) => {
    const { classKey, message } = payload;
    logStatus(`${classKey}: ${message}`);
  });

  ipcRenderer.on('generate-all-timetables-response', (event, res) => {
    setLoading(false);
    if (res.success) {
      showToast('All timetables generated successfully', 'success');
      logStatus(res.message);
    } else {
      showToast('Error: ' + res.message, 'danger');
      logStatus(res.message);
    }
  });

  ipcRenderer.on('clear-all-timetables-response', (event, res) => {
    setLoading(false);
    if (res.success) {
      showToast('All timetables cleared successfully', 'success');
      logStatus(res.message);
    } else {
      showToast('Error: ' + res.message, 'danger');
      logStatus(res.message);
    }
  });

  ipcRenderer.on('get-class-timetable-response', (event, res) => {
    if (res.success) {
      currentTimetable = res.data;
      const first = currentTimetable[0];
      if (timetableTitle) {
        timetableTitle.textContent = first
          ? `Timetable for Class: ${first.semester} - ${first.branch} - ${first.section}`
          : 'Timetable (No entries found)';
      }
      renderTimetable();
    } else {
      showToast('Error: ' + res.message, 'danger');
    }
  });

  ipcRenderer.on('get-teacher-timetable-response', (event, res) => {
    if (res.success) {
      currentTimetable = res.data;
      if (viewTeacherSelect && timetableTitle) {
        const teacherId = viewTeacherSelect.value;
        const teacher = allTeachers.find((t) => t.id === teacherId);
        timetableTitle.textContent = teacher
          ? `Timetable for Teacher: ${teacher.full_name} (${teacher.id})`
          : 'Teacher Timetable';
      }
      renderTimetable();
    } else {
      showToast('Error: ' + res.message, 'danger');
    }
  });

  ipcRenderer.on('get-classroom-timetable-response', (event, res) => {
    if (res.success) {
      currentTimetable = res.data;
      if (viewClassroomSelect && timetableTitle) {
        const roomId = viewClassroomSelect.value;
        const classroom = allClassrooms.find((c) => c.room_id === roomId);
        const label = classroom
          ? `${classroom.room_id} (${
              classroom.type === 'lab' ? 'Lab' : 'Lecture Room'
            })`
          : 'Classroom Timetable';
        timetableTitle.textContent = `Timetable for Classroom: ${label}`;
      }
      renderTimetable();
    } else {
      showToast('Error: ' + res.message, 'danger');
    }
  });

  function setLoading(loading) {
    if (loadingSpinner) {
      loadingSpinner.style.display = loading ? 'block' : 'none';
    }
    if (generateAllBtn) {
      generateAllBtn.disabled = loading;
    }
    if (clearAllBtn) {
      clearAllBtn.disabled = loading;
    }
  }

  function logStatus(msg) {
    if (!statusLog) return;

    const time = new Date().toLocaleTimeString();
    statusLog.innerHTML += `<div>[${time}] ${msg}</div>`;
    statusLog.scrollTop = statusLog.scrollHeight;
  }

  function renderTimetable() {
    if (!timetableContainer || !timetableBody) return;

    timetableContainer.style.display = 'block';
    timetableBody.innerHTML = '';
    const grid = {};

    // Initialize empty grid
    for (const day of days) {
      grid[day] = {};
      for (const period of periods) grid[day][period] = null;
    }

    // Fill the grid with timetable entries
    for (const entry of currentTimetable) {
      if (grid[entry.day] && grid[entry.day][entry.period] !== null) {
        console.warn('Timetable conflict:', entry);
      } else if (grid[entry.day]) {
        grid[entry.day][entry.period] = entry;
      }
    }

    // Render the grid
    for (const day of days) {
      const row = document.createElement('tr');

      const dayCell = document.createElement('th');
      dayCell.textContent = day;
      row.appendChild(dayCell);

      for (const period of periods) {
        const cell = document.createElement('td');
        const entry = grid[day][period];

        if (entry) {
          const viewType = viewTypeSelect ? viewTypeSelect.value : 'class';
          if (viewType === 'class') {
            cell.innerHTML = `
              <strong>${entry.subject_name || entry.course_code}</strong> (${
              entry.display_code || entry.course_code
            })<br>
              Teacher: ${entry.teacher_name}<br>
              Room: ${entry.room_id}
            `;
          } else if (viewType === 'teacher') {
            cell.innerHTML = `
              <strong>${entry.subject_name || entry.course_code}</strong> (${
              entry.display_code || entry.course_code
            })<br>
              Class: ${entry.semester} - ${entry.branch} - ${entry.section}<br>
              Room: ${entry.room_id}
            `;
          } else if (viewType === 'classroom') {
            cell.innerHTML = `
              <strong>${entry.subject_name || entry.course_code}</strong> (${
              entry.display_code || entry.course_code
            })<br>
              Teacher: ${entry.teacher_name}<br>
              Class: ${entry.semester} - ${entry.branch} - ${entry.section}
            `;
          }

          // Add lab session indicator if applicable
          if (entry.is_lab) {
            cell.innerHTML += `<br><span class="badge bg-info">Lab Session ${entry.lab_session}</span>`;
          }

          // Color coding by subject
          const subjectHash = hashCode(entry.course_code);
          const hue = subjectHash % 360;
          cell.style.backgroundColor = `hsl(${hue}, 70%, 90%)`;

          // Tooltip for extra info
          cell.title = `${entry.subject_name || entry.course_code}\nTeacher: ${
            entry.teacher_name
          }\nRoom: ${entry.room_id}${entry.is_lab ? '\nLab Session' : ''}`;
        } else {
          cell.textContent = '-';
        }

        row.appendChild(cell);
      }

      timetableBody.appendChild(row);
    }
  }

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
