const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const DiscordRPC = require('discord-rpc');
const { machineIdSync } = require('node-machine-id');
const { autoUpdater } = require('electron-updater');

let win;
let splash;
const clientId = '1029115154954211399'; 
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const startTimestamp = new Date();
let rpcReady = false;

autoUpdater.autoDownload = false;
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

if (!app.isPackaged) {
    autoUpdater.forceDevUpdateConfig = true;
}

function createWindow() {
    splash = new BrowserWindow({
        width: 450,
        height: 350,
        transparent: true, 
        frame: false, 
        alwaysOnTop: true,
        resizable: false,
        center: true,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    splash.loadFile('splash.html');

    win = new BrowserWindow({
        width: 1270,
        height: 720,
        show: false,
        resizable: true, 
        minWidth: 1270,
        minHeight: 720, 
        maximizable: true, 
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#00000000',
            symbolColor: '#888',
            height: 35
        },
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.on('maximize', () => {
        win.setResizable(true);
    });

    win.on('unmaximize', () => {
        win.setResizable(true);
    });

    win.loadFile('index.html');
    win.setMenuBarVisibility(false);

    win.once('ready-to-show', () => {
        setTimeout(() => {
            if (splash) splash.close();
            win.show();
            autoUpdater.checkForUpdatesAndNotify();
        }, 2000);
    });

    const menuTemplate = [
        {
            label: 'Archivo',
            submenu: [
                { label: 'Nuevo', accelerator: 'CmdOrCtrl+N', click: () => win.webContents.send('menu-new-file') },
                { 
                    label: 'Abrir', 
                    accelerator: 'CmdOrCtrl+O', 
                    click: () => {
                        dialog.showOpenDialog({
                            properties: ['openFile'],
                            filters: [{ name: 'Twoo & Text Files', extensions: ['twoo', 'txt'] }]
                        }).then(result => {
                            if (!result.canceled) {
                                const filePath = result.filePaths[0];
                                const content = fs.readFileSync(filePath, 'utf-8');
                                win.webContents.send('file-data', content, filePath);
                            }
                        });
                    }
                },
                { label: 'Guardar', accelerator: 'CmdOrCtrl+S', click: () => win.webContents.send('menu-save-file') },
                { type: 'separator' },
                { label: 'Salir', role: 'quit' }
            ]
        },
        {
            label: 'Editar',
            submenu: [
                { label: 'Deshacer', role: 'undo' }, { label: 'Rehacer', role: 'redo' },
                { type: 'separator' },
                { label: 'Cortar', role: 'cut' }, { label: 'Copiar', role: 'copy' }, { label: 'Pegar', role: 'paste' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    win.webContents.on('did-finish-load', () => {
        const filePath = process.argv.find(arg => arg.endsWith('.twoo') || arg.endsWith('.txt'));
        if (filePath && fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            win.webContents.send('file-data', content, filePath);
        }
    });
}


ipcMain.on('check_for_updates', () => {
    autoUpdater.checkForUpdates();
});

autoUpdater.on('update-available', (info) => {
    console.log("¡Actualización encontrada!", info.version);
    win.webContents.send('update_available', info.version);
});

autoUpdater.on('update-not-available', () => {
    console.log("No hay actualizaciones.  ", app.getVersion());
    win.webContents.send('update_not_available');
});

autoUpdater.on('error', (err) => {
    console.error("Error del actualizador:", err);
    win.webContents.send('update_error', err.message);
});

autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update_downloaded');
});


ipcMain.on('download_update', () => {
    autoUpdater.downloadUpdate();
});

ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
});


ipcMain.on('app-ready', () => {
    if (splash) splash.close();
    if (win) win.show();
});

async function setActivity(details, state) {
    if (!rpcReady) return;
    try {
        await rpc.setActivity({
            startTimestamp,
            largeImageKey: 'twooprojects',
            largeImageText: 'Twoo Projects',
            instance: false,
        });
    } catch (e) {}
}

rpc.on('ready', () => {
    rpcReady = true;
    setActivity('Twoo Projects', 'Navegando');
});

rpc.login({ clientId }).catch(() => { rpcReady = false; });

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine) => {
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();
            const filePath = commandLine.find(arg => arg.endsWith('.twoo') || arg.endsWith('.txt'));
            if (filePath && fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                win.webContents.send('file-data', content, filePath);
            }
        }
    });
    app.whenReady().then(createWindow);
}

ipcMain.on('update-rpc', (event, details, state) => {
    setActivity(details, state);
});

ipcMain.handle('get-hwid', () => {
    let id = machineIdSync();
    return id;
});

ipcMain.on('toggle-discord', (event, enabled) => {
    if (!enabled) {
        rpc.clearActivity().catch(() => {});
    } else {
        setActivity('Twoo Projects', 'Navegando');
    }
});

ipcMain.on('set-menubar', (event, visible) => {
    if (win) win.setMenuBarVisibility(visible);
});

ipcMain.on('save-file', (event, content) => {
    dialog.showSaveDialog({
        title: 'Guardar Proyecto',
        filters: [{ name: 'Twoo Files', extensions: ['twoo'] }, { name: 'Text Files', extensions: ['txt'] }]
    }).then(result => {
        if (!result.canceled) {
            fs.writeFileSync(result.filePath, content);
            event.reply('file-saved', result.filePath);
        }
    });
});

ipcMain.on('save-direct', (event, content, filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content);
    }
});

ipcMain.on('open-file', (event) => {
    dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Twoo & Text Files', extensions: ['twoo', 'txt'] }]
    }).then(result => {
        if (!result.canceled) {
            const filePath = result.filePaths[0];
            const content = fs.readFileSync(filePath, 'utf-8');
            event.reply('file-data', content, filePath);
        }
    });
});

ipcMain.on('open-specific-file', (event, filePath) => {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        event.reply('file-data', content, filePath);
    }
});