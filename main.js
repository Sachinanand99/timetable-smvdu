const { app, BrowserWindow } = require('electron/main');
const path = require('path');

require('./db/schema');
require('./ipc/teacher');
require('./ipc/subject');
require('./ipc/classroom');
require('./ipc/class');
require('./ipc/teaching-assignment');
require('./ipc/timetable');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.loadFile('index.html');
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
