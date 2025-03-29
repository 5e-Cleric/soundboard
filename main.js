const { app, BrowserWindow } = require('electron');
const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

function getFilesInDirectory(directory) {
	const files = fs.readdirSync(directory).filter((file) => {
		const filePath = path.join(directory, file);
		const stat = fs.statSync(filePath);
		return stat.isFile();
	});
	return files;
}

function getSubdirectories(directory) {
	const subfolders = fs.readdirSync(directory).filter((subfolder) => {
		return fs.statSync(path.join(directory, subfolder)).isDirectory();
	});
	return subfolders;
}

ipcMain.handle('get-sounds', (event, list) => {
	let directory;

	const downloadsFolder = app.getPath('downloads');

	if (list === 'All') {
		directory = path.join(downloadsFolder, 'sounds');
	} else {
		directory = path.join(downloadsFolder, 'sounds', list);
	}

	try {
		let filePaths = [];

		if (list === 'All') {
			const subfolders = fs.readdirSync(directory).filter((subfolder) => {
				return fs.statSync(path.join(directory, subfolder)).isDirectory();
			});

			subfolders.forEach((subfolder) => {
				const subfolderPath = path.join(directory, subfolder);
				const files = getFilesInDirectory(subfolderPath);
				filePaths = filePaths.concat(files.map((file) => path.join(subfolderPath, file))); // Map to full paths
			});
		} else {
			const files = getFilesInDirectory(directory);
			filePaths = files.map((file) => path.join(directory, file)); // Map to full paths
		}

		console.log('Files found:', filePaths);

		return filePaths;
	} catch (error) {
		console.error('Error reading directory:', error);
		return [];
	}
});

ipcMain.handle('get-subdirectories', () => {
	const downloadsFolder = app.getPath('downloads');
	const soundsDirectory = path.join(downloadsFolder, 'sounds');

	try {
		const subdirectories = getSubdirectories(soundsDirectory);
		console.log('Subdirectories found:', subdirectories);
		return subdirectories; // Return the list of subdirectories
	} catch (error) {
		console.error('Error reading subdirectories:', error);
		return []; // Return an empty array in case of error
	}
});

let mainWindow;

app.whenReady().then(() => {
	mainWindow = new BrowserWindow({
		show: false,
		webPreferences: {
			nodeIntegration: false, // Disable node integration for security
			contextIsolation: true, // Ensure isolation for renderer process
			preload: path.join(__dirname, 'preload.js'), // Preload script for renderer communication
		},
	});
	mainWindow.loadFile('index.html');
	mainWindow.maximize();
	mainWindow.show();
});
