export function attachLogic(ipcRenderer) {
  let allClassrooms = [];

  const form = document.getElementById('classroom-form');
  const tbody = document.querySelector('#classroom-table tbody');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const classroom = {
      room_id: document.getElementById('room-id').value.trim(),
      capacity: parseInt(document.getElementById('capacity').value),
      type: document.getElementById('room-type').value,
    };
    ipcRenderer.send('add-classroom', classroom);
  });

  ipcRenderer.on('add-classroom-response', (event, res) => {
    if (res.success) {
      showToast('Classroom added successfully', 'success');
      form.reset();
      loadClassrooms();
    } else {
      showToast('❌ Error: ' + res.message, 'danger');
    }
  });

  ipcRenderer.on('get-classrooms-response', (event, res) => {
    if (res.success) {
      allClassrooms = res.data;
      filterClassrooms('all');
    } else {
      showToast('Error loading classrooms: ' + res.message, 'info');
    }
  });

  function loadClassrooms() {
    ipcRenderer.send('get-classrooms');
  }

  function filterClassrooms(type) {
    tbody.innerHTML = '';
    const filtered =
      type === 'all'
        ? allClassrooms
        : allClassrooms.filter((c) => c.type === type);
    filtered.forEach((c) => {
      const typeDisplay = c.type === 'lab' ? 'Laboratory' : 'Lecture Room';
      tbody.innerHTML += `
        <tr>
          <td>${c.room_id}</td>
          <td>${c.capacity}</td>
          <td>${typeDisplay}</td>
        </tr>`;
    });
  }

  loadClassrooms();
}
