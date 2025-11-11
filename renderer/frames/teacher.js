export function attachLogic(ipcRenderer) {
  const form = document.getElementById('teacher-form');
  const idInput = document.getElementById('teacher-id');
  const nameInput = document.getElementById('teacher-name');
  const tableBody = document.querySelector('#teacher-table tbody');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ipcRenderer.send('add-teacher', {
      id: idInput.value.trim(),
      full_name: nameInput.value.trim(),
    });
  });

  ipcRenderer.removeAllListeners('get-teachers-response');
  ipcRenderer.on('add-teacher-response', (event, res) => {
    if (res.success) {
      showToast('Teacher added');
      form.reset();
      loadTeachers();
    } else {
      showToast('Error: ' + res.message, 'danger');
    }
  });

  function loadTeachers() {
    ipcRenderer.send('get-teachers');
  }

  ipcRenderer.on('get-teachers-response', (event, res) => {
    requestAnimationFrame(() => {
      tableBody.innerHTML = '';
      const fragment = document.createDocumentFragment();
      res.data.forEach((t) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${t.id}</td><td>${t.full_name}</td>`;
        fragment.appendChild(row);
      });
      tableBody.appendChild(fragment);
    });
  });

  loadTeachers();
}
