export function attachLogic(ipcRenderer, bootstrap) {
  let allClasses = [];
  let currentClass = null;
  let allSubjects = [];
  let allTeachers = [];
  const classDetailsModal = new bootstrap.Modal(
    document.getElementById('classDetailsModal')
  );

  const form = document.getElementById('class-form');
  const semesterFilter = document.getElementById('semester-filter');
  const classTableBody = document.querySelector('#class-table tbody');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const classData = {
      semester: document.getElementById('semester').value.trim(),
      branch: document.getElementById('branch').value.trim(),
      section: document.getElementById('section').value.trim(),
      strength: document.getElementById('strength').value.trim(),
    };
    ipcRenderer.send('add-class', classData);
  });

  ipcRenderer.on('add-class-response', (event, res) => {
    if (res.success) {
      showToast('Teacher added successfully', 'success');
      form.reset();
      loadClasses();
    } else {
      showToast('Error: ' + res.message, 'danger');
    }
  });

  ipcRenderer.on('get-classes-response', (event, res) => {
    if (res.success) {
      allClasses = res.data;
      updateSemesterFilter();
      filterClassesBySemester();
    } else {
      showToast('Error loading classes: ' + res.message, 'danger');
    }
  });

  semesterFilter.addEventListener('change', filterClassesBySemester);

  function loadClasses() {
    ipcRenderer.send('get-classes');
  }

  function updateSemesterFilter() {
    semesterFilter.innerHTML = '<option value="all">All Semesters</option>';
    const semesters = [...new Set(allClasses.map((c) => c.semester))];
    semesters.forEach((semester) => {
      semesterFilter.innerHTML += `<option value="${semester}">${semester}</option>`;
    });
  }

  function filterClassesBySemester() {
    const selected = semesterFilter.value;
    const filtered =
      selected === 'all'
        ? allClasses
        : allClasses.filter((c) => c.semester === selected);
    classTableBody.innerHTML = '';
    filtered.forEach((c) => {
      classTableBody.innerHTML += `
        <tr>
          <td>${c.semester}</td>
          <td>${c.branch}</td>
          <td>${c.section}</td>
          <td>${c.strength}</td>
          <td>
            <button class="btn btn-sm btn-info" onclick="showClassDetails('${c.semester}', '${c.branch}', '${c.section}', '${c.strength}')">
              Details
            </button>
          </td>
        </tr>`;
    });
  }

  window.showClassDetails = function (semester, branch, section, strength) {
    currentClass = { semester, branch, section, strength };
    document.getElementById(
      'classDetailsModalLabel'
    ).textContent = `Class Details: ${semester} - ${branch} - ${section} - ${strength}`;
    loadClassSubjects();
    loadClassTeachers();
    loadAllSubjects();
    loadAllTeachers();
    classDetailsModal.show();
  };

  function loadClassSubjects() {
    if (!currentClass) return;
    ipcRenderer.send('get-class-subjects', currentClass);
  }

  function loadClassTeachers() {
    if (!currentClass) return;
    ipcRenderer.send('get-class-teachers', currentClass);
  }

  function loadAllSubjects() {
    ipcRenderer.send('get-subjects');
  }

  function loadAllTeachers() {
    ipcRenderer.send('get-teachers');
  }

  ipcRenderer.on('get-class-subjects-response', (event, res) => {
    const tbody = document.querySelector('#class-subjects-table tbody');
    tbody.innerHTML = '';
    if (res.success) {
      res.data.forEach((s) => {
        tbody.innerHTML += `
          <tr>
            <td>${s.course_code}</td>
            <td>${s.name}</td>
            <td>${s.credits || 0}</td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="removeSubjectFromClass('${
                s.course_code
              }')">Remove</button>
            </td>
          </tr>`;
      });
    } else {
      console.error('Error loading class subjects:', res.message);
    }
  });

  ipcRenderer.on('get-class-teachers-response', (event, res) => {
    const tbody = document.querySelector('#class-teachers-table tbody');
    tbody.innerHTML = '';
    if (res.success) {
      res.data.forEach((t) => {
        tbody.innerHTML += `
          <tr>
            <td>${t.teacher_id}</td>
            <td>${t.full_name}</td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="removeTeacherFromClass('${t.teacher_id}')">Remove</button>
            </td>
          </tr>`;
      });
    } else {
      console.error('Error loading class teachers:', res.message);
    }
  });

  ipcRenderer.on('get-subjects-response', (event, res) => {
    if (res.success) {
      allSubjects = res.data;
      const subjectSelect = document.getElementById('subject-select');
      subjectSelect.innerHTML = '<option value="">Select Subject</option>';
      allSubjects.forEach((s) => {
        subjectSelect.innerHTML += `<option value="${s.course_code}">${s.name} (${s.course_code})</option>`;
      });
    } else {
      console.error('Error loading subjects:', res.message);
    }
  });

  ipcRenderer.on('get-teachers-response', (event, res) => {
    if (res.success) {
      allTeachers = res.data;
      const teacherSelect = document.getElementById('teacher-select');
      teacherSelect.innerHTML = '<option value="">Select Teacher</option>';
      allTeachers.forEach((t) => {
        teacherSelect.innerHTML += `<option value="${t.id}">${t.full_name} (${t.id})</option>`;
      });
    } else {
      console.error('Error loading teachers:', res.message);
    }
  });

  document.getElementById('add-subject-btn').addEventListener('click', () => {
    if (!currentClass) return;
    const courseCode = document.getElementById('subject-select').value;
    if (!courseCode) return showToast('Please select a subject', 'danger');
    ipcRenderer.send('add-class-subject', {
      ...currentClass,
      course_code: courseCode,
    });
  });

  document.getElementById('add-teacher-btn').addEventListener('click', () => {
    if (!currentClass) return;
    const teacherId = document.getElementById('teacher-select').value;
    if (!teacherId) return showToast('Please select a teacher', 'info');
    ipcRenderer.send('add-class-teacher', {
      ...currentClass,
      teacher_id: teacherId,
    });
  });

  window.removeSubjectFromClass = function (courseCode) {
    if (!currentClass) return;
    if (
      confirm('Are you sure you want to remove this subject from the class?')
    ) {
      ipcRenderer.send('remove-class-subject', {
        ...currentClass,
        course_code: courseCode,
      });
    }
  };

  window.removeTeacherFromClass = function (teacherId) {
    if (!currentClass) return;
    if (
      confirm('Are you sure you want to remove this teacher from the class?')
    ) {
      ipcRenderer.send('remove-class-teacher', {
        ...currentClass,
        teacher_id: teacherId,
      });
    }
  };

  ipcRenderer.on('add-class-subject-response', (event, res) => {
    if (res.success) loadClassSubjects();
    else showToast('Error: ' + res.message, 'danger');
  });

  ipcRenderer.on('add-class-teacher-response', (event, res) => {
    if (res.success) loadClassTeachers();
    else showToast('Error: ' + res.message, 'danger');
  });

  ipcRenderer.on('remove-class-subject-response', (event, res) => {
    if (res.success) loadClassSubjects();
    else showToast('Error: ' + res.message, 'danger');
  });

  ipcRenderer.on('remove-class-teacher-response', (event, res) => {
    if (res.success) loadClassTeachers();
    else showToast('Error: ' + res.message, 'danger');
  });

  loadClasses(); // Initial load
}
