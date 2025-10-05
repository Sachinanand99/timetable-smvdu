export function attachLogic(ipcRenderer) {
  let allClasses = [];
  let allTeachers = [];
  let allClassrooms = [];
  let currentTimetable = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  // DOM references
  const semesterSelect = document.getElementById('semester-select');
  const branchSelect = document.getElementById('branch-select');
  const sectionSelect = document.getElementById('section-select');
  const viewTypeSelect = document.getElementById('view-type');
  const viewClassSelect = document.getElementById('view-class');
  const viewTeacherSelect = document.getElementById('view-teacher');
  const viewClassroomSelect = document.getElementById('view-classroom');
  const timetableTitle = document.getElementById('timetable-title');
  const timetableContainer = document.getElementById('timetable-container');
  const timetableBody = document.querySelector('#timetable tbody');
  const loadingSpinner = document.getElementById('loading-spinner');

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
      const semesters = [...new Set(allClasses.map((c) => c.semester))];
      semesterSelect.innerHTML = '<option value="">Select Semester</option>';
      semesters.forEach(
        (s) =>
          (semesterSelect.innerHTML += `<option value="${s}">${s}</option>`)
      );

      viewClassSelect.innerHTML = '<option value="">Select Class</option>';
      allClasses.forEach((c) => {
        const label = `${c.semester} - ${c.branch} - ${c.section}`;
        const value = `${c.semester}|${c.branch}|${c.section}`;
        viewClassSelect.innerHTML += `<option value="${value}">${label}</option>`;
      });
    }
  });

  ipcRenderer.on('get-teachers-response', (event, res) => {
    if (res.success) {
      allTeachers = res.data;
      viewTeacherSelect.innerHTML = '<option value="">Select Teacher</option>';
      allTeachers.forEach((t) => {
        viewTeacherSelect.innerHTML += `<option value="${t.id}">${t.full_name} (${t.id})</option>`;
      });
    }
  });

  ipcRenderer.on('get-classrooms-response', (event, res) => {
    if (res.success) {
      allClassrooms = res.data;
      viewClassroomSelect.innerHTML =
        '<option value="">Select Classroom</option>';
      allClassrooms.forEach((c) => {
        const label = `${c.room_id} (${
          c.type === 'lab' ? 'Lab' : 'Lecture'
        }, Capacity: ${c.capacity})`;
        viewClassroomSelect.innerHTML += `<option value="${c.room_id}">${label}</option>`;
      });
    }
  });

  semesterSelect.addEventListener('change', () => {
    const semester = semesterSelect.value;
    const filtered = allClasses.filter((c) => c.semester === semester);
    const branches = [...new Set(filtered.map((c) => c.branch))];
    branchSelect.innerHTML = '<option value="">Select Branch</option>';
    branches.forEach(
      (b) => (branchSelect.innerHTML += `<option value="${b}">${b}</option>`)
    );
    sectionSelect.innerHTML = '<option value="">Select Section</option>';
  });

  branchSelect.addEventListener('change', () => {
    const semester = semesterSelect.value;
    const branch = branchSelect.value;
    const filtered = allClasses.filter(
      (c) => c.semester === semester && c.branch === branch
    );
    const sections = [...new Set(filtered.map((c) => c.section))];
    sectionSelect.innerHTML = '<option value="">Select Section</option>';
    sections.forEach(
      (s) => (sectionSelect.innerHTML += `<option value="${s}">${s}</option>`)
    );
  });

  viewTypeSelect.addEventListener('change', () => {
    const type = viewTypeSelect.value;
    document.getElementById('view-class-container').style.display =
      type === 'class' ? 'block' : 'none';
    document.getElementById('view-teacher-container').style.display =
      type === 'teacher' ? 'block' : 'none';
    document.getElementById('view-classroom-container').style.display =
      type === 'classroom' ? 'block' : 'none';
  });

  document.getElementById('generate-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const semester = semesterSelect.value;
    const branch = branchSelect.value;
    const section = sectionSelect.value;
    if (!semester || !branch || !section)
      return showToast('Please select semester, branch, and section', 'info');
    loadingSpinner.style.display = 'block';
    ipcRenderer.send('generate-timetable', { semester, branch, section });
  });

  document.getElementById('view-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = viewTypeSelect.value;
    if (type === 'class') {
      const value = viewClassSelect.value;
      if (!value) return showToast('Please select a class', 'info');
      const [semester, branch, section] = value.split('|');
      ipcRenderer.send('get-class-timetable', { semester, branch, section });
    } else if (type === 'teacher') {
      const teacherId = viewTeacherSelect.value;
      if (!teacherId) return showToast('Please select a teacher', 'info');
      ipcRenderer.send('get-teacher-timetable', teacherId);
    } else if (type === 'classroom') {
      const roomId = viewClassroomSelect.value;
      if (!roomId) return showToast('Please select a classroom', 'info');
      ipcRenderer.send('get-classroom-timetable', roomId);
    }
  });

  document
    .getElementById('clear-timetable-btn')
    .addEventListener('click', () => {
      const semester = semesterSelect.value;
      const branch = branchSelect.value;
      const section = sectionSelect.value;
      if (!semester || !branch || !section)
        return showToast('Please select semester, branch, and section', 'info');
      if (
        confirm('Are you sure you want to clear the timetable for this class?')
      ) {
        ipcRenderer.send('clear-class-timetable', {
          semester,
          branch,
          section,
        });
      }
    });

  ipcRenderer.on('generate-timetable-response', (event, res) => {
    loadingSpinner.style.display = 'none';
    if (res.success) {
      showToast('Timetable generated successfully', 'success');
      ipcRenderer.send('get-class-timetable', {
        semester: semesterSelect.value,
        branch: branchSelect.value,
        section: sectionSelect.value,
      });
    } else {
      showToast('❌ Error: ' + res.message, 'danger');
    }
  });

  ipcRenderer.on('get-class-timetable-response', (event, res) => {
    if (res.success) {
      currentTimetable = res.data;
      const first = currentTimetable[0];
      timetableTitle.textContent = first
        ? `Timetable for Class: ${first.semester} - ${first.branch} - ${first.section}`
        : 'Timetable (No entries found)';
      renderTimetable();
    } else {
      showToast('❌ Error: ' + res.message, 'danger');
    }
  });

  ipcRenderer.on('get-teacher-timetable-response', (event, res) => {
    if (res.success) {
      currentTimetable = res.data;
      const teacherId = viewTeacherSelect.value;
      const teacher = allTeachers.find((t) => t.id === teacherId);
      timetableTitle.textContent = teacher
        ? `Timetable for Teacher: ${teacher.full_name} (${teacher.id})`
        : 'Teacher Timetable';
      renderTimetable();
    } else {
      showToast('❌ Error: ' + res.message, 'danger');
    }
  });

  ipcRenderer.on('get-classroom-timetable-response', (event, res) => {
    if (res.success) {
      currentTimetable = res.data;
      const roomId = viewClassroomSelect.value;
      const classroom = allClassrooms.find((c) => c.room_id === roomId);
      const label = classroom
        ? `${classroom.room_id} (${
            classroom.type === 'lab' ? 'Lab' : 'Lecture Room'
          })`
        : 'Classroom Timetable';
      timetableTitle.textContent = `Timetable for Classroom: ${label}`;
      renderTimetable();
    } else {
      showToast('❌ Error: ' + res.message, 'danger');
    }
  });

  ipcRenderer.on('clear-class-timetable-response', (event, res) => {
    if (res.success) {
      showToast('Timetable cleared successfully', 'success');
      currentTimetable = [];
      timetableTitle.textContent = 'Timetable (Cleared)';
      renderTimetable();
    } else {
      showToast('❌ Error: ' + res.message, 'danger');
    }
  });

  function renderTimetable() {
    timetableContainer.style.display = 'block';
    timetableBody.innerHTML = '';
    const grid = {};

    for (const period of periods) {
      grid[period] = {};
      for (const day of days) grid[period][day] = null;
    }

    // Fill the grid with timetable entries
    for (const entry of currentTimetable) {
      if (grid[entry.period] && grid[entry.period][entry.day]) {
        console.warn('Timetable conflict:', entry);
      } else if (grid[entry.period]) {
        grid[entry.period][entry.day] = entry;
      }
    }

    // Render the grid
    for (const period of periods) {
      const row = document.createElement('tr');

      const periodCell = document.createElement('th');
      periodCell.textContent = `Period ${period}`;
      row.appendChild(periodCell);

      for (const day of days) {
        const cell = document.createElement('td');
        const entry = grid[period][day];

        if (entry) {
          const viewType = viewTypeSelect.value;
          if (viewType === 'class') {
            cell.innerHTML = `
              <strong>${entry.subject_name}</strong> (${
              entry.display_code || entry.course_code
            })<br>
              Teacher: ${entry.teacher_name}<br>
              Room: ${entry.room_id}
            `;
          } else if (viewType === 'teacher') {
            cell.innerHTML = `
              <strong>${entry.subject_name}</strong> (${
              entry.display_code || entry.course_code
            })<br>
              Class: ${entry.semester} - ${entry.branch} - ${entry.section}<br>
              Room: ${entry.room_id}
            `;
          } else if (viewType === 'classroom') {
            cell.innerHTML = `
              <strong>${entry.subject_name}</strong> (${
              entry.display_code || entry.course_code
            })<br>
              Teacher: ${entry.teacher_name}<br>
              Class: ${entry.semester} - ${entry.branch} - ${entry.section}
            `;
          }

          const subjectHash = hashCode(entry.course_code);
          const hue = subjectHash % 360;
          cell.style.backgroundColor = `hsl(${hue}, 70%, 90%)`;
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
