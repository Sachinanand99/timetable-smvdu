export function attachLogic(ipcRenderer) {
  let allAssignments = [];
  let allTeachers = [];
  let allSubjects = [];
  let allClasses = [];

  const form = document.getElementById('assignment-form');
  const teacherSelect = document.getElementById('teacher-select');
  const subjectSelect = document.getElementById('subject-select');
  const semesterSelect = document.getElementById('semester-select');
  const branchSelect = document.getElementById('branch-select');
  const sectionSelect = document.getElementById('section-select');
  const filterTeacher = document.getElementById('filter-teacher');
  const filterClass = document.getElementById('filter-class');
  const assignmentTableBody = document.querySelector('#assignment-table tbody');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const assignment = {
      teacher_id: teacherSelect.value,
      course_code: subjectSelect.value,
      semester: semesterSelect.value,
      branch: branchSelect.value,
      section: sectionSelect.value,
    };
    ipcRenderer.send('add-teaching-assignment', assignment);
  });

  ipcRenderer.on('add-teaching-assignment-response', (event, res) => {
    if (res.success) {
      showToast('Teaching assignment added successfully', 'success');
      form.reset();
      loadAssignments();
    } else {
      showToast('Error: ' + res.message, 'danger');
    }
  });

  ipcRenderer.on('get-teachers-response', (event, res) => {
    if (res.success) {
      allTeachers = res.data;
      teacherSelect.innerHTML = '<option value="">Select Teacher</option>';
      filterTeacher.innerHTML = '<option value="all">All Teachers</option>';
      allTeachers.forEach((t) => {
        const option = `<option value="${t.id}">${t.full_name} (${t.id})</option>`;
        teacherSelect.innerHTML += option;
        filterTeacher.innerHTML += option;
      });
    }
  });

  ipcRenderer.on('get-subjects-response', (event, res) => {
    if (res.success) {
      allSubjects = res.data;
      subjectSelect.innerHTML = '<option value="">Select Subject</option>';
      allSubjects.forEach((s) => {
        subjectSelect.innerHTML += `<option value="${s.course_code}">${s.name} (${s.course_code})</option>`;
      });
    }
  });

  ipcRenderer.on('get-classes-response', (event, res) => {
    if (res.success) {
      allClasses = res.data;
      const semesters = [...new Set(allClasses.map((c) => c.semester))];
      semesterSelect.innerHTML = '<option value="">Select Semester</option>';
      semesters.forEach((s) => {
        semesterSelect.innerHTML += `<option value="${s}">${s}</option>`;
      });

      filterClass.innerHTML = '<option value="all">All Classes</option>';
      allClasses.forEach((c) => {
        const label = `${c.semester} - ${c.branch} - ${c.section}`;
        const value = `${c.semester}|${c.branch}|${c.section}`;
        filterClass.innerHTML += `<option value="${value}">${label}</option>`;
      });
    }
  });

  semesterSelect.addEventListener('change', () => {
    const selectedSemester = semesterSelect.value;
    const filtered = allClasses.filter((c) => c.semester === selectedSemester);
    const branches = [...new Set(filtered.map((c) => c.branch))];
    branchSelect.innerHTML = '<option value="">Select Branch</option>';
    branches.forEach((b) => {
      branchSelect.innerHTML += `<option value="${b}">${b}</option>`;
    });
    sectionSelect.innerHTML = '<option value="">Select Section</option>';
  });

  branchSelect.addEventListener('change', () => {
    const selectedSemester = semesterSelect.value;
    const selectedBranch = branchSelect.value;
    const filtered = allClasses.filter(
      (c) => c.semester === selectedSemester && c.branch === selectedBranch
    );
    const sections = [...new Set(filtered.map((c) => c.section))];
    sectionSelect.innerHTML = '<option value="">Select Section</option>';
    sections.forEach((s) => {
      sectionSelect.innerHTML += `<option value="${s}">${s}</option>`;
    });
  });

  ipcRenderer.on('get-teaching-assignments-response', (event, res) => {
    if (res.success) {
      allAssignments = res.data;
      filterAssignments();
    }
  });

  ipcRenderer.on('delete-teaching-assignment-response', (event, res) => {
    if (res.success) {
      loadAssignments();
    } else {
      showToast('Error: ' + res.message, 'danger');
    }
  });

  filterTeacher.addEventListener('change', filterAssignments);
  filterClass.addEventListener('change', filterAssignments);

  function filterAssignments() {
    const teacherFilterValue = filterTeacher.value;
    const classFilterValue = filterClass.value;
    let filtered = allAssignments;

    if (teacherFilterValue !== 'all') {
      filtered = filtered.filter((a) => a.teacher_id === teacherFilterValue);
    }

    if (classFilterValue !== 'all') {
      const [semester, branch, section] = classFilterValue.split('|');
      filtered = filtered.filter(
        (a) =>
          a.semester === semester &&
          a.branch === branch &&
          a.section === section
      );
    }

    assignmentTableBody.innerHTML = '';
    filtered.forEach((a) => {
      assignmentTableBody.innerHTML += `
        <tr>
          <td>${a.teacher_name} (${a.teacher_id})</td>
          <td>${a.subject_name} (${a.course_code})</td>
          <td>${a.semester} - ${a.branch} - ${a.section}</td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="deleteAssignment('${a.teacher_id}', '${a.course_code}', '${a.semester}', '${a.branch}', '${a.section}')">Delete</button>
          </td>
        </tr>`;
    });
  }

  window.deleteAssignment = function (
    teacherId,
    courseCode,
    semester,
    branch,
    section
  ) {
    if (confirm('Are you sure you want to delete this teaching assignment?')) {
      ipcRenderer.send('delete-teaching-assignment', {
        teacher_id: teacherId,
        course_code: courseCode,
        semester,
        branch,
        section,
      });
    }
  };

  function loadTeachers() {
    ipcRenderer.send('get-teachers');
  }
  function loadSubjects() {
    ipcRenderer.send('get-subjects');
  }
  function loadClasses() {
    ipcRenderer.send('get-classes');
  }
  function loadAssignments() {
    ipcRenderer.send('get-teaching-assignments');
  }

  function loadInitialData() {
    loadTeachers();
    loadSubjects();
    loadClasses();
    loadAssignments();
  }

  loadInitialData();
}
