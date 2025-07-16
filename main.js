const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const kill = require('tree-kill');
const path = require('path');

let goProcess = null;
let frontendProcess = null;
let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    mainWindow.maximize()
    // Load the frontend URL with error handling
    mainWindow.loadURL('http://localhost:5173').catch(err => {
        console.error('Failed to load frontend:', err);
        // You might want to show an error page or retry here
    });

    // Handle window closed event
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startBackend() {
    try {
        goProcess = spawn('go', ['run', 'main.go'], {
            cwd: path.join(__dirname, '../backend'),
            stdio: ['inherit', 'pipe', 'pipe'],
        });

        goProcess.stdout.on('data', (data) => {
            console.log(`Go backend: ${data}`);
        });

        goProcess.stderr.on('data', (data) => {
            console.error(`Go backend error: ${data}`);
        });

        goProcess.on('error', (err) => {
            console.error('Failed to start Go backend:', err);
        });

        goProcess.on('close', (code) => {
            console.log(`Go backend process exited with code ${code}`);
            if (code !== 0) {
                // Handle backend crash
            }
        });

        return goProcess;
    } catch (err) {
        console.error('Error starting Go backend:', err);
        return null;
    }
}

function startFrontend() {
    try {
        frontendProcess = spawn('pnpm', ['dev'], {
            cwd: path.join(__dirname, '../frontend'),
            stdio: ['inherit', 'pipe', 'pipe'],
        });

        frontendProcess.stdout.on('data', (data) => {
            console.log(`Frontend: ${data}`);
        });

        frontendProcess.stderr.on('data', (data) => {
            console.error(`Frontend error: ${data}`);
        });

        frontendProcess.on('error', (err) => {
            console.error('Failed to start frontend:', err);
        });

        frontendProcess.on('close', (code) => {
            console.log(`Frontend process exited with code ${code}`);
            if (code !== 0) {
                // Handle frontend crash
            }
        });

        return frontendProcess;
    } catch (err) {
        console.error('Error starting frontend:', err);
        return null;
    }
}

async function cleanExit() {
    console.log('Cleaning up processes...');

    const killProcess = (process, name) => {
        return new Promise((resolve) => {
            if (process && process.pid) {
                kill(process.pid, 'SIGKILL', (err) => {
                    if (err) {
                        console.error(`Failed to kill ${name} process:`, err);
                    } else {
                        console.log(`${name} process killed`);
                        process = null;
                        resolve();
                        return;
                    }
                });
            } else {
                resolve();
            }
        });
    };

    await killProcess(goProcess, 'Go');
    await killProcess(frontendProcess, 'Frontend');

    if (mainWindow) {
        mainWindow.close();
    }
}

app.whenReady().then(() => {
    startBackend();
    startFrontend();

    // Give the frontend some time to start
    setTimeout(createWindow, 3000);
});

app.on('before-quit', async () => {
    await cleanExit();
});

app.on('window-all-closed', async () => {
    if (process.platform !== 'darwin') {
        await cleanExit();
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// Handle unexpected errors
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
});