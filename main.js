const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

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

function assignMissingTrackNumbers(filePaths) {
	const totalTracks = filePaths.length;
	const sequentialTracks = Array.from({ length: totalTracks }, (_, index) => index + 1);

	const files = filePaths.map((filePath) => {
		const currentTrack = NodeID3.read(filePath).trackNumber || 0;
		return { filePath, currentTrack };
	});

	files.sort((a, b) => a.currentTrack - b.currentTrack);

	files.forEach((file, i) => {
		const expected = sequentialTracks[i];
		let assigned = file.currentTrack;
		if (file.currentTrack !== expected) {
			assigned = expected;
		}
		updateTrackNumber(file.filePath, assigned);
	});
}

function sortFiles(mp3Files) {
	return mp3Files
		.map((filePath) => {
			const tags = NodeID3.read(filePath) || {};
			return { filePath, trackNumber: tags.trackNumber ? parseInt(tags.trackNumber, 10) : 0 };
		})
		.sort((a, b) => a.trackNumber - b.trackNumber)
		.map((file) => file.filePath);
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
		const mp3Files = filePaths.filter((file) => file.endsWith('.mp3'));
		return mp3Files;
	} catch (error) {
		console.error('Error reading directory:', error);
		return [];
	}
});

const { nanoid } = require('nanoid');
const NodeID3 = require('node-id3');

function assignMissingUFID(filePath) {
	let tags = NodeID3.read(filePath) || {};

	if (!tags.uniqueFileIdentifier || !tags.uniqueFileIdentifier[0].ownerIdentifier) {
		const newUFID = nanoid();
		const updatedTags = {
			...tags,
			UFID: [
				{
					ownerIdentifier: 'SNDBRD',
					identifier: Buffer.from(newUFID),
				},
			],
		};
		NodeID3.write(updatedTags, filePath);
		return newUFID;
	}
	return tags.uniqueFileIdentifier[0].identifier.toString();
}

ipcMain.handle('get-songs', async (event, list) => {
	let directory = path.join(app.getPath('downloads'), 'songs', list === 'All' ? '' : list);
	let thumbnail = list !== 'All' ? path.join(directory, 'thumbnail.jpg') : null;

	try {
		let filePaths = getFilesInDirectory(directory).map((file) => path.join(directory, file));

		if (list === 'All') {
			getSubdirectories(directory).forEach((subfolder) => {
				const subfolderPath = path.join(directory, subfolder);
				const files = getFilesInDirectory(subfolderPath);
				filePaths = filePaths.concat(files.map((file) => path.join(subfolderPath, file)));
			});
		}

		const mp3Files = filePaths.filter((file) => file.endsWith('.mp3'));

		assignMissingTrackNumbers(mp3Files);
		const sortedFiles = sortFiles(mp3Files);

		const fileMetadata = await Promise.all(
			sortedFiles.map(async (filePath) => {
				const tags = NodeID3.read(filePath) || {};
				const metadata = await mm.parseFile(filePath);

				const songId = assignMissingUFID(filePath);
				const base64Image = tags.image?.imageBuffer.toString('base64') || '';
				const imageSrc = `data:${tags.image?.mime};base64,${base64Image}` || '';
				return {
					id: songId,
					name: path.basename(filePath),
					source: filePath,
					author: tags.artist || 'Unknown Artist',
					album: tags.album || 'Unknown Album',
					trackNumber: tags.trackNumber || 'Unknown',
					duration: metadata.format.duration ? Math.round(metadata.format.duration) : 'Unknown',
					thumbnail: imageSrc,
				};
			})
		);

		return { files: fileMetadata, thumbnail: fs.existsSync(thumbnail) ? thumbnail : null };
	} catch (error) {
		console.error('Error reading directory:', error);
		return { files: [], thumbnail: null };
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
