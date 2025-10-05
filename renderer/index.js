const { ipcRenderer } = require('electron');
const bootstrap =
  (window.bootstrap = require('bootstrap/dist/js/bootstrap.bundle.js'));

// Toast system
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');

  toast.className = `toast align-items-center text-bg-${type} border-0 show`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => container.removeChild(toast), 500);
  }, 3000);
}

// Dynamic frame loader
function loadFrame(name) {
  // Clean up all IPC listeners before switching frames
  ipcRenderer.removeAllListeners();

  fetch(`components/${name}.html`)
    .then((res) => res.text())
    .then((html) => {
      const container = document.getElementById('frame-container');
      container.innerHTML = html;

      // Dynamically import and attach logic
      import(`./frames/${name}.js`)
        .then((module) => {
          module.attachLogic(ipcRenderer, bootstrap, showToast);
        })
        .catch((err) => {
          console.error(`Failed to load logic for ${name}:`, err);
        });
    });
}

// Expose globally
window.loadFrame = loadFrame;
window.showToast = showToast;
