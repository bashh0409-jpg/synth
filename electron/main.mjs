import { app, BrowserWindow, dialog } from "electron";

const applicationUrl = app.isPackaged
  ? process.env.ELECTRON_PRODUCTION_URL || "https://synthplum.vercel.app/"
  : process.env.ELECTRON_START_URL || "http://localhost:3000";

let mainWindow = null;

async function openWindow() {
  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      partition: "persist:arcture",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(applicationUrl);
}

app.whenReady().then(openWindow).catch((error) => {
  console.error("Unable to open the Arcture app.", error);
  dialog.showErrorBox(
    "Unable to open Arcture",
    error instanceof Error ? error.message : String(error),
  );
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    openWindow().catch((error) => {
      console.error("Unable to reopen the Arcture app.", error);
      app.quit();
    });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
