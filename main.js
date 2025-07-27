const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

app.commandLine.appendSwitch('no-sandbox'); // Fix the Linux sandbox crash

let goProcess = null;
let mainWindow = null;

const isDev = !app.isPackaged;
const RESOURCES_PATH = isDev ? path.join(__dirname, '..') : process.resourcesPath;

function resolveFrontendIndex() {
    return isDev
        ? path.join(__dirname, '../frontend/dist/index.html')   // dev: you built vite locally
        : path.join(RESOURCES_PATH, 'frontend', 'dist', 'index.html'); // packaged
}

function resolveBackendBinary() {
    return isDev
        ? path.join(__dirname, '../backend/hanouty-backend')
        : path.join(RESOURCES_PATH, 'backend', 'hanouty-backend');
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    mainWindow.maximize();

    const indexPath = resolveFrontendIndex();
    mainWindow.loadFile(indexPath).catch(err => {
        console.error('Failed to load frontend:', err, 'path=', indexPath);
    });

    mainWindow.on('closed', () => (mainWindow = null));
}

function startBackend() {
    const backendPath = resolveBackendBinary();

    // set cwd to the backend folder so it can find .env placed next to it
    const cwd = path.dirname(backendPath);

    goProcess = spawn(backendPath, [], { cwd });

    goProcess.stdout.on('data', (data) => console.log(`Go backend: ${data}`));
    goProcess.stderr.on('data', (data) => console.error(`Go backend error: ${data}`));
    goProcess.on('close', (code) => console.log(`Go backend exited with code ${code}`));
    goProcess.on('error', (err) => console.error('Failed to start Go backend:', err));
}

app.whenReady().then(() => {
    startBackend();
    createWindow();
});

app.on('window-all-closed', () => {
    if (goProcess) goProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});
