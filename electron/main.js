const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let serverProcess;

function startServer() {
    if (process.env.SKIP_SERVER === 'true') {
        console.log('Skipping backend startup (managed externally)');
        return;
    }

    let command, args, cwd;

    if (isDev) {
        const serverPath = path.join(__dirname, '../server_py/main.py');
        command = process.platform === 'win32' ? 'py' : 'python3';
        args = process.platform === 'win32' ? ['-3', serverPath] : [serverPath];
        cwd = path.join(__dirname, '../server_py');
    } else {
        // Updated path logic for production
        const possiblePaths = [
            path.join(process.resourcesPath, 'server_py', 'dist', 'clearpath_server.exe'),
            path.join(process.resourcesPath, 'clearpath_server.exe'),
            path.join(path.dirname(process.execPath), 'resources', 'server_py', 'dist', 'clearpath_server.exe')
        ];

        command = possiblePaths.find(p => fs.existsSync(p));

        if (!command) {
            const errorMsg = `CRITICAL: Backend executable not found.\nPaths searched:\n${possiblePaths.join('\n')}`;
            console.error(errorMsg);
            dialog.showErrorBox('Error de Inicio', errorMsg);
            return;
        }
        
        args = [];
        cwd = path.dirname(command);
    }
    
    console.log(`Starting backend: ${command} ${args.join(' ')}`);
    serverProcess = spawn(command, args, {
        cwd: cwd,
        env: { ...process.env, PORT: '5000' }
    });

    serverProcess.on('error', (err) => {
        console.error('CRITICAL: Failed to spawn backend:', err);
        dialog.showErrorBox('Error de Servidor', `No se pudo iniciar el backend:\n${err.message}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`Backend Stderr: ${data}`);
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
        icon: path.join(__dirname, '../client/public/logo.png')
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
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
        } else {
            serverProcess.kill();
        }
    }
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    if (serverProcess) {
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
        } else {
            serverProcess.kill();
        }
    }
});
