export function attachLogic(ipcRenderer) {
  const form = document.getElementById('teacher-form');
  const idInput = document.getElementById('teacher-id');
  const nameInput = document.getElementById('teacher-name');
  const tableBody = document.querySelector('#teacher-table tbody');

  const availabilityTeacherSelect = document.getElementById(
    'availability-teacher'
  );
  const loadAvailabilityBtn = document.getElementById('load-availability-btn');
  const clearAvailabilityBtn = document.getElementById(
    'clear-availability-btn'
  );
  const saveAvailabilityBtn = document.getElementById('save-availability-btn');
  const availabilityGridBody = document.getElementById(
    'availability-grid-body'
  );

  const toast =
    (window && window.showToast) || ((message) => console.log(message));

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [
    { id: 1, label: '9 am - 10 am' },
    { id: 2, label: '10 am - 11 am' },
    { id: 3, label: '11 am - 12 pm' },
    { id: 4, label: '12 pm - 1 pm' },
    { id: 5, label: '2 pm - 3 pm' },
    { id: 6, label: '3 pm - 4 pm' },
    { id: 7, label: '4 pm - 5 pm' },
  ];

  const availabilityInputs = new Map();

  buildAvailabilityGrid();

  ipcRenderer.removeAllListeners('get-teachers-response');
  ipcRenderer.removeAllListeners('add-teacher-response');
  ipcRenderer.removeAllListeners('get-teacher-availability-response');
  ipcRenderer.removeAllListeners('update-teacher-availability-response');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ipcRenderer.send('add-teacher', {
        id: idInput.value.trim(),
        full_name: nameInput.value.trim(),
      });
    });
  }

  ipcRenderer.on('add-teacher-response', (event, res) => {
    if (res.success) {
      toast('Teacher added');
      form?.reset();
      loadTeachers();
    } else {
      toast('Error: ' + res.message, 'danger');
    }
  });

  ipcRenderer.on('get-teachers-response', (event, res) => {
    requestAnimationFrame(() => {
      if (!res || !Array.isArray(res.data)) return;

      const currentSelection = availabilityTeacherSelect?.value || '';
      tableBody.innerHTML = '';
      const fragment = document.createDocumentFragment();
      res.data.forEach((t) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${t.id}</td><td>${t.full_name}</td>`;
        fragment.appendChild(row);
      });
      tableBody.appendChild(fragment);

      if (availabilityTeacherSelect) {
        availabilityTeacherSelect.innerHTML =
          '<option value="">Select Teacher</option>';
        res.data.forEach((t) => {
          const option = document.createElement('option');
          option.value = t.id;
          option.textContent = `${t.full_name} (${t.id})`;
          if (t.id === currentSelection) {
            option.selected = true;
          }
          availabilityTeacherSelect.appendChild(option);
        });

        if (!availabilityTeacherSelect.value && res.data.length === 1) {
          availabilityTeacherSelect.value = res.data[0].id;
        }
      }
    });
  });

  ipcRenderer.on('get-teacher-availability-response', (event, res) => {
    if (res.success) {
      applyAvailability(res.data || []);
      toast('Availability loaded', 'info');
    } else {
      toast('Error: ' + res.message, 'danger');
    }
  });

  ipcRenderer.on('update-teacher-availability-response', (event, res) => {
    if (res.success) {
      applyAvailability(res.data || []);
      toast('Availability saved');
    } else {
      toast('Error: ' + res.message, 'danger');
    }
  });

  function loadTeachers() {
    ipcRenderer.send('get-teachers');
  }

  function buildAvailabilityGrid() {
    if (!availabilityGridBody) return;
    availabilityGridBody.innerHTML = '';
    availabilityInputs.clear();

    days.forEach((day) => {
      const row = document.createElement('tr');
      const headerCell = document.createElement('th');
      headerCell.textContent = day;
      headerCell.classList.add('text-start');
      row.appendChild(headerCell);

      periods.forEach((period) => {
        const cell = document.createElement('td');
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-check', 'd-flex', 'justify-content-center');

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.classList.add('form-check-input');
        input.dataset.day = day;
        input.dataset.period = String(period.id);

        wrapper.appendChild(input);
        cell.appendChild(wrapper);
        row.appendChild(cell);

        availabilityInputs.set(`${day}-${period.id}`, input);
      });

      availabilityGridBody.appendChild(row);
    });
  }

  function applyAvailability(slots) {
    clearAvailabilityGrid();
    if (!Array.isArray(slots)) return;
    slots.forEach((slot) => {
      const key = `${slot.day}-${slot.period}`;
      const checkbox = availabilityInputs.get(key);
      if (checkbox) {
        checkbox.checked = false;
      }
    });
  }

  function clearAvailabilityGrid() {
    availabilityInputs.forEach((input) => {
      input.checked = true;
    });
  }

  function collectBlockedSlots() {
    const blocked = [];
    availabilityInputs.forEach((input, key) => {
      if (!input.checked) {
        const [day, period] = key.split('-');
        blocked.push({ day, period: Number(period) });
      }
    });
    return blocked;
  }

  function requestAvailability() {
    const teacherId = availabilityTeacherSelect?.value;
    if (!teacherId) {
      toast('Select a teacher first', 'info');
      return;
    }
    ipcRenderer.send('get-teacher-availability', teacherId);
  }

  loadAvailabilityBtn?.addEventListener('click', requestAvailability);

  availabilityTeacherSelect?.addEventListener('change', () => {
    if (availabilityTeacherSelect.value) {
      requestAvailability();
    } else {
      clearAvailabilityGrid();
    }
  });

  clearAvailabilityBtn?.addEventListener('click', () => {
    clearAvailabilityGrid();
  });

  saveAvailabilityBtn?.addEventListener('click', () => {
    const teacherId = availabilityTeacherSelect?.value;
    if (!teacherId) {
      toast('Select a teacher to save availability', 'info');
      return;
    }

    const slots = collectBlockedSlots();
    ipcRenderer.send('update-teacher-availability', {
      teacherId,
      slots,
    });
  });

  loadTeachers();
}
