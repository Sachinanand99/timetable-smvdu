export function attachLogic(ipcRenderer) {
  const form = document.getElementById('subject-form');
  const tbody = document.querySelector('#subject-table tbody');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const subject = {
      course_code: document.getElementById('course-code').value.trim(),
      name: document.getElementById('subject-name').value.trim(),
      lecture_hr: parseInt(document.getElementById('lecture-hr').value) || 0,
      theory_hr: parseInt(document.getElementById('theory-hr').value) || 0,
      practical_hr:
        parseInt(document.getElementById('practical-hr').value) || 0,
      credits: parseInt(document.getElementById('credits').value) || 0,
      display_code: document.getElementById('display-code').value.trim(),
      course_coordinator: document
        .getElementById('course-coordinator')
        .value.trim(),
    };
    ipcRenderer.send('add-subject', subject);
  });

  ipcRenderer.on('add-subject-response', (event, res) => {
    if (res.success) {
      showToast('Subject added successfully', 'success');
      form.reset();
      loadSubjects();
    } else {
      showToast('❌ Error: ' + res.message, 'danger');
    }
  });

  ipcRenderer.on('get-subjects-response', (event, res) => {
    tbody.innerHTML = '';
    if (res.success) {
      res.data.forEach((s) => {
        tbody.innerHTML += `
          <tr>
            <td>${s.course_code}</td>
            <td>${s.name}</td>
            <td>${s.lecture_hr || 0}</td>
            <td>${s.theory_hr || 0}</td>
            <td>${s.practical_hr || 0}</td>
            <td>${s.credits || 0}</td>
            <td>${s.display_code || ''}</td>
            <td>${s.course_coordinator || ''}</td>
          </tr>`;
      });
    } else {
      showToast('Error loading subjects: ' + res.message, 'info');
    }
  });

  function loadSubjects() {
    ipcRenderer.send('get-subjects');
  }

  loadSubjects();
}
