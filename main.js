const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const NodeID3 = require('node-id3');
const mm = require('music-metadata');

function getFilesInDirectory(directory) {
	return fs.readdirSync(directory).filter((file) => {
		const filePath = path.join(directory, file);
		return fs.statSync(filePath).isFile();
	});
}

function getSubdirectories(directory) {
	return fs.readdirSync(directory).filter((subfolder) => {
		return fs.statSync(path.join(directory, subfolder)).isDirectory();
	});
}

function updateTrackNumber(filePath, trackNumber) {
	let tags = NodeID3.read(filePath) || {};
	tags.trackNumber = trackNumber.toString();
	NodeID3.write(tags, filePath);
}

function getOrderedTrackNumbers(filePaths) {
	const trackNumbers = filePaths
		.map((filePath) => {
			const tags = NodeID3.read(filePath) || {};
			return tags.trackNumber ? parseInt(tags.trackNumber, 10) : null;
		})
		.filter((num) => num !== null)
		.sort((a, b) => a - b);

	return trackNumbers;
}

function assignMissingTrackNumbers(filePaths) {
	const existingTracks = getOrderedTrackNumbers(filePaths);
	let nextTrack = existingTracks.length ? Math.max(...existingTracks) + 1 : 1;

	const sortedFiles = [...filePaths].sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

	sortedFiles.forEach((filePath) => {
		const tags = NodeID3.read(filePath) || {};
		if (!tags.trackNumber) {
			updateTrackNumber(filePath, nextTrack);
			nextTrack++;
		}
	});
}

ipcMain.handle('get-sounds', (event, list) => {
	let directory = path.join(app.getPath('downloads'), 'sounds', list === 'All' ? '' : list);

	try {
		let filePaths = getFilesInDirectory(directory).map((file) => path.join(directory, file));
		

		if (list === 'All') {
			getSubdirectories(directory).forEach((subfolder) => {
				const subfolderPath = path.join(directory, subfolder);
				const files = getFilesInDirectory(subfolderPath);
				filePaths = filePaths.concat(files.map((file) => path.join(subfolderPath, file)));

			});
		}
		const mp3Files = filePaths.filter(file => file.endsWith('.mp3'));
		return mp3Files;
	} catch (error) {
		console.error('Error reading directory:', error);
		return [];
	}
});

ipcMain.handle('get-songs', async (event, list) => {
	let directory = path.join(app.getPath('downloads'), 'songs', list === 'All' ? '' : list);

	try {
		let filePaths = getFilesInDirectory(directory).map((file) => path.join(directory, file));

		if (list === 'All') {
			getSubdirectories(directory).forEach((subfolder) => {
				const subfolderPath = path.join(directory, subfolder);
				const files = getFilesInDirectory(subfolderPath);
				filePaths = filePaths.concat(files.map((file) => path.join(subfolderPath, file)));
			});
		}

		const mp3Files = filePaths.filter(file => file.endsWith('.mp3'));
		assignMissingTrackNumbers(mp3Files);

		const fileMetadata = await Promise.all(
			mp3Files.map(async (filePath) => {
				const tags = NodeID3.read(filePath) || {};
				const metadata = await mm.parseFile(filePath);

				return {
					name: path.basename(filePath),
					source: filePath,
					author: tags.artist || 'Unknown Artist',
					album: tags.album || 'Unknown Album',
					trackNumber: tags.trackNumber || 'Unknown',
					duration: metadata.format.duration ? Math.round(metadata.format.duration) : 'Unknown',
				};
			})
		);
		return fileMetadata;
	} catch (error) {
		console.error('Error reading directory:', error);
		return [];
	}
});

ipcMain.handle('get-subdirectories', (event, type) => {
	const soundsDirectory = path.join(app.getPath('downloads'), type);
	try {
		return getSubdirectories(soundsDirectory);
	} catch (error) {
		console.error('Error reading subdirectories:', error);
		return [];
	}
});

app.whenReady().then(() => {
	let mainWindow = new BrowserWindow({
		show: false,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, 'preload.js'),
		},
	});
	mainWindow.loadFile('index.html');
	mainWindow.maximize();
	mainWindow.show();
});
