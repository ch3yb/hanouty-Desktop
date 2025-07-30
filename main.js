const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const dns = require('dns');
const fs = require("fs");
const util = require("node:util");

// global variables
let win

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
        title:"Hanouti | Manage My Store"
    });
    mainWindow.maximize();

    const indexPath = resolveFrontendIndex();
    mainWindow.loadFile(indexPath).catch(err => {
        console.error('Failed to load frontend:', err, 'path=', indexPath);
    });

    mainWindow.on('closed', () => (mainWindow = null));
}

function createErrWindow(isNew) {
    if (isNew){
    win = new BrowserWindow({
        width: 800,
        height: 600,
        title:"no connection!"
    })
    win.loadFile('error.html')
    }
    setTimeout(async ()=>{
        if (await isOnline()){
            win?.close()
            createWindow()
        }else {
            createErrWindow(false)
        }
    },10000)

}

const isOnline = async () => {
    try {
        const lookup = util.promisify(dns.lookup);
        await lookup('cloudflare.com');
        return true;
    } catch (err) {
        return false;
    }
};

const startBackend =  () => {
    try {
        const backendPath = resolveBackendBinary();
        const cwd = path.dirname(backendPath);

        if (!fs.existsSync(backendPath)) {
            throw new Error(`Backend binary not found at ${backendPath}`);
        }

        goProcess = spawn(backendPath, [], { cwd });

        const startupTimeout = setTimeout(() => {
            console.error('Backend startup timeout');
            goProcess.kill();
        }, 10000);

        goProcess.on('spawn', () => {
            clearTimeout(startupTimeout);
            console.log('Backend process started successfully');
        });

    } catch (err) {
        console.error('Failed to start backend: ',err)
        throw err
    }
}

app.whenReady().then(async () => {
    const online = await isOnline();
    if (!online) {
        createErrWindow(true);
        return;
    }

   startBackend();
    createWindow();
});

app.on('window-all-closed', () => {
    if (goProcess) goProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => {
    if (goProcess) goProcess.kill();
})
app.on('activate', async () => {
    if (mainWindow === null) {
        if (await isOnline()) {
            createWindow();
        } else {
            createErrWindow(true);
        }
    }
});
