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
      showToast('Error: ' + res.message, 'danger');
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

  // Subjects
  ipcRenderer.on('get-subjects-response', (event, res) => {
    if (res.success) {
      const subjectSelect = document.getElementById('subject-select');
      subjectSelect.innerHTML = '<option value="">Select Subject</option>';

      const assignmentTbody = document.querySelector('#assignment-table tbody');
      assignmentTbody.innerHTML = ''; // clear old rows

      res.data.forEach((s) => {
        const labInfo = s.lab_room_id ? ` → Lab: ${s.lab_room_id}` : '';
        subjectSelect.innerHTML += `<option value="${s.course_code}">${s.name} (${s.course_code})${labInfo}</option>`;

        if (s.lab_room_id) {
          addAssignmentRow(
            `${s.name} (${s.course_code})`,
            s.lab_room_id,
            s.course_code
          );
        }
      });
    }
  });


  // Labs
  ipcRenderer.on('get-classrooms-by-type-response', (event, res) => {
    if (res.success && res.data.length) {
      const type = res.data[0].type; // lab or lecture
      if (type === 'lab') {
        const labSelect = document.getElementById('lab-select');
        labSelect.innerHTML = '<option value="">Select Lab</option>';
        res.data.forEach((c) => {
          labSelect.innerHTML += `<option value="${c.room_id}">${c.room_id} (${c.capacity})</option>`;
        });
      } else {
        const classroomSelect = document.getElementById('classroom-select');
        if (classroomSelect) {
          classroomSelect.innerHTML =
            '<option value="">Select Classroom</option>';
          res.data.forEach((c) => {
            classroomSelect.innerHTML += `<option value="${c.room_id}">${c.room_id} (${c.capacity})</option>`;
          });
        }
      }
    }
  });

  // Classes
  ipcRenderer.on('get-classes-response', (event, res) => {
    if (res.success) {
      const classSelect = document.getElementById('class-select');
      if (classSelect) {
        classSelect.innerHTML = '<option value="">Select Class</option>';
        res.data.forEach((c) => {
          classSelect.innerHTML += `<option value="${c.semester}-${c.branch}-${c.section}">
            ${c.semester} ${c.branch} ${c.section}
          </option>`;
        });
      }
    }
  });
  
  ipcRenderer.on('assign-lab-to-subject-response', (event, res) => {
    if (res.success) {
      showToast('Lab assigned successfully', 'success');
      ipcRenderer.send('get-subjects'); // refresh subjects and assignments

      const s = res.data; // updated subject from backend
      if (s && s.lab_room_id) {
        addAssignmentRow(
          `${s.name} (${s.course_code})`,
          s.lab_room_id,
          s.course_code
        );
      }
    } else {
      showToast('Error: ' + res.message, 'danger');
    }
  });



 ipcRenderer.on('delete-lab-assignment-response', (event, res) => {
   if (res.success) {
     showToast('Lab assignment removed', 'info');
     ipcRenderer.send('get-subjects'); // refresh dropdown and table
   } else {
     showToast('Error: ' + res.message, 'danger');
   }
 });



  const assignLabBtn = document.getElementById('assign-lab-btn');
  if (assignLabBtn) {
    assignLabBtn.addEventListener('click', () => {
      const course_code = document.getElementById('subject-select').value;
      const room_id = document.getElementById('lab-select').value;
      if (!course_code || !room_id) {
        showToast('Select subject and lab first', 'danger');
        return;
      }
      ipcRenderer.send('assign-lab-to-subject', { course_code, room_id });
    });
  }

  const assignClassroomBtn = document.getElementById('assign-classroom-btn');
  if (assignClassroomBtn) {
    assignClassroomBtn.addEventListener('click', () => {
      const classVal = document.getElementById('class-select').value;
      const room_id = document.getElementById('classroom-select').value;
      if (!classVal || !room_id) {
        showToast('Select class and classroom first', 'danger');
        return;
      }
      const [semester, branch, section] = classVal.split('-');
      ipcRenderer.send('assign-classroom-to-class', {
        semester,
        branch,
        section,
        room_id,
      });
    });
  }
  
  function addAssignmentRow(entity, room, course_code) {
    const tbody = document.querySelector('#assignment-table tbody');
    const row = document.createElement('tr');

    row.innerHTML = `
    <td>${entity}</td>
    <td>${room}</td>
    <td><button class="btn btn-sm btn-danger">Delete</button></td>
  `;

    row.querySelector('button').addEventListener('click', () => {
      ipcRenderer.send('delete-lab-assignment', course_code);
    });

    tbody.appendChild(row);
  }




  function loadClassrooms() {
    ipcRenderer.send('get-classrooms');
    // Load dropdown data
    ipcRenderer.send('get-subjects'); // all subjects
    ipcRenderer.send('get-classrooms-by-type', 'lab'); // labs only
    ipcRenderer.send('get-classrooms-by-type', 'lecture'); // lecture rooms only
    ipcRenderer.send('get-classes'); // all classes
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
  window.filterClassrooms = filterClassrooms;
  document.addEventListener('DOMContentLoaded', () => {
  attachLogic(window.ipcRenderer);
});

  loadClassrooms();
}
