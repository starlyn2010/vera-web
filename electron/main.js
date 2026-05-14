const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let serverProcess;

function startServer() {
    if (process.env.SKIP_SERVER === 'true') {
        console.log('Skipping backend startup (managed externally)');
        return;
    }
    const serverPath = path.join(__dirname, '../server_py/main.py');
    const pythonExe = process.platform === 'win32' ? 'py' : 'python3';
    const args = process.platform === 'win32' ? ['-3', serverPath] : [serverPath];
    
    console.log(`Starting backend: ${pythonExe} ${args.join(' ')}`);
    serverProcess = spawn(pythonExe, args, {
        cwd: path.join(__dirname, '../server_py'),
        env: { ...process.env, PORT: 5000 }
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`Backend Log: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
    });

    serverProcess.on('error', (err) => {
        console.error('CRITICAL: Failed to start backend:', err);
    });

    serverProcess.on('exit', (code, signal) => {
        console.log(`Backend process exited with code ${code} and signal ${signal}`);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        icon: path.join(__dirname, '../client/public/logo.jpeg')
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../client/dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    console.log('Electron App Ready');
    startServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
}).catch(err => {
    console.error('Failed to initialize app:', err);
});

app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
