function initializeSongPage() {
	const loop = document.querySelector('#content-songs .buttons .loop');
	const shuffle = document.querySelector('#content-songs .buttons .shuffle');

	const loopState = localStorage.getItem('loop-state') || 'none';
	loop.setAttribute('data-state', loopState);
	updateLoopUI(loopState, loop);

	loop.addEventListener('click', () => toggleLoop(loop));
	shuffle.addEventListener('click', (e) => shuffleList());

	const savedVolume = localStorage.getItem('song-volume');
	changeVolume(savedVolume);

	const volumeElement = document.querySelector('#content-songs .volume input');
	volumeElement.addEventListener('input', (e) => changeVolume(e.target.value, true));

	const muteButton = document.querySelector('#content-songs .volume button');
	muteButton.addEventListener('click', () => toggleMute());

	const audio = document.getElementById('song');
	audio.addEventListener('ended', () => {
		const current = allSongs.find((s) => s.id === audio.getAttribute('data-track-id'));
		loadNext(current);
	});

	loadSongs('All');
}

let allSongs = [];

function shuffleList() {
	const songList = document.getElementById('songList');
	const songs = Array.from(songList.getElementsByClassName('song'));

	songList.classList.add('shuffling');

	// Shuffle the songs array using Fisher-Yates
	setTimeout(() => {
		for (let i = songs.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[songs[i], songs[j]] = [songs[j], songs[i]]; // Swap
		}

		songs.forEach((song) => songList.appendChild(song));

		songList.classList.remove('shuffling');
	}, 500); // Timeout matches the CSS transition duration
}

function toggleLoop(loop) {
	const nextState = {
		none: 'list',
		list: 'song',
		song: 'none',
	}[loop.getAttribute('data-state')];

	loop.setAttribute('data-state', nextState);
	updateLoopUI(nextState, loop);
	localStorage.setItem('loop-state', nextState);
}

function updateLoopUI(state, loop) {
	loop.classList.remove('list', 'song');
	loop.innerHTML = '<i class="fas fa-repeat"></i>';

	if (state === 'none') {
		loop.classList.remove('active');
	} else if (state === 'list') {
		loop.classList.add('list', 'active');
	} else if (state === 'song') {
		loop.classList.add('song', 'active');
		loop.innerHTML += '<i class="fas fa-1"></i>';
	}
}

function toggleMute() {
	const volumeElement = document.querySelector('#content-songs .volume input');
	const volume = volumeElement.value;

	const savedVolume = localStorage.getItem('song-volume');

	if (volume == 0 && savedVolume) {
		changeVolume(savedVolume, false);
	} else {
		changeVolume(0, false);
	}
}

function changeVolume(value, store) {
	const volumeElement = document.querySelector('#content-songs .volume input');
	const volSymbol = volumeElement.previousElementSibling.querySelector('i');

	volumeElement.nextElementSibling.textContent = `${Math.round(value * 100)}%`;
	volumeElement.value = value;

	if (value > 0.5) volSymbol.classList = 'fa fa-volume-high';
	if (value < 0.5) volSymbol.classList = 'fa fa-volume-low';
	if (value == 0) volSymbol.classList = 'fa fa-volume-xmark';

	const audio = document.getElementById('song');
	audio.volume = value;

	if (store) {
		localStorage.setItem(`song-volume`, value);
	}
}

function loadSongs(list) {
	const songList = document.getElementById('songList');
	const template = document.getElementById('songTemplate');
	const currentSongId = document.getElementById('song').getAttribute('data-track-id');

	songList.classList.add('shuffling');

	window.electron.ipcRenderer.invoke('get-songs', list).then((list) => {
		songList.textContent = '';

		const songs = list.files;
		allSongs = songs;

		if (songs.length === 0) {
			let noSongs = document.createElement('div');
			noSongs.innerHTML = `<p>You may add more songs adding them inside the songs directory in your downloads folder.</p>`;
			songList.appendChild(noSongs);
		}

		songs.forEach((song) => {
			const songName = song.name.substring(0, song.name.lastIndexOf('.')) || song.name;
			const durationWithUnits = formatDuration(song.duration);
			const songElement = template.content.cloneNode(true);
			const templateNumber = songElement.querySelector('.number');
			const templateButton = songElement.querySelector('button');
			const templateTitle = songElement.querySelector('.title');
			const templateAuthor = songElement.querySelector('.author');
			const templateAlbum = songElement.querySelector('.album');
			const templateDuration = songElement.querySelector('.duration');

			songElement.querySelector('.song').setAttribute('data-track-id', song.id);
			songElement.querySelector('.song').setAttribute('data-source', song.source);
			templateButton.addEventListener('click', () => playSong(song));

			templateNumber.textContent = song.trackNumber;
			templateTitle.textContent = songName;
			templateAuthor.textContent = song.author;
			templateAlbum.textContent = song.album;
			templateDuration.textContent = durationWithUnits;

			songList.appendChild(songElement);
			setTimeout(() => {
				if (song.id == currentSongId) setPlayingState(song);
			}, 50);
		});

		const randomSong = songs[Math.floor(Math.random() * songs.length)];
		if (!currentSongId && randomSong) {
			stopSong(0);
			loadControls(randomSong);
			setPlayingState(randomSong);
		}

		setTimeout(() => songList.classList.remove('shuffling'), 500);
	});
}

function stopSong(time) {
	const audio = document.getElementById('song');
	setStoppingState();
	if (time !== undefined) {
		audio.currentTime = time;
	}
	if (audio.currentTime != 0 && !audio.paused) {
		audio.pause();
	}
}

function setStoppingState() {
	const songElements = document.querySelectorAll('#songList .song.playing');
	songElements.forEach((el) => {
		el.classList.remove('playing');
		const buttonIcon = el.querySelector(`button i`);
		buttonIcon.classList.remove('fa-pause');
		buttonIcon.classList.add('fa-play');
	});

	const playIcon = document.querySelector('#content-songs .buttons .play i');
	playIcon.classList.remove('fa-pause');
	playIcon.classList.add('fa-play');
}

function formatDuration(durationInSeconds) {
	const hours = Math.floor(durationInSeconds / 3600);
	const minutes = Math.floor((durationInSeconds % 3600) / 60);
	const seconds = Math.floor(durationInSeconds % 60);

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	} else {
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}
}

function playSong(song) {
	const audio = document.getElementById('song');
	const isCurrent = audio.getAttribute('data-track-id') == song.id;
	const isPlaying = !audio.paused;
	if (isCurrent && isPlaying) {
		stopSong();
	} else if (isCurrent && audio.paused) {
		audio.play();
		setPlayingState(song);
	} else if (!isCurrent) {
		if (audio.currentTime != 0 && !audio.paused) audio.currentTime = 0;
		loadControls(song);

		audio.addEventListener('canplay', function handleCanPlay() {
			audio.removeEventListener('canplay', handleCanPlay);
			audio.play();
			setPlayingState(song);
		});
	}
}

function setPlayingState(song) {
	setStoppingState();

	const audio = document.getElementById('song');
	const songElement = getSongElement(song.id);
	songElement.classList.add('playing');

	if (!audio.paused) {
		const buttonIcon = songElement.querySelector(`button i`);
		buttonIcon.classList.remove('fa-play');
		buttonIcon.classList.add('fa-pause');
		const playIcon = document.querySelector('#content-songs .buttons .play i');
		playIcon.classList.remove('fa-play');
		playIcon.classList.add('fa-pause');
	}
}

function getSongElement(id) {
	return document.querySelector(`#songList .song[data-track-id="${id}"]`);
}

function getSong(id) {
	return allSongs.filter((song) => song.id === id)[0];
}

function loadControls(song) {
	const audio = document.getElementById('song');

	audio.setAttribute('data-track-id', song.id);
	audio.setAttribute('src', song.source);

	const songName = song.name.substring(0, song.name.lastIndexOf('.')) || song.name;

	const playing = document.querySelector('#content-songs > .playing');
	const thumbnail = document.querySelector('.currentSong .thumbnail');
	const title = playing.querySelector(' .currentSong .details .title');
	const author = playing.querySelector(' .currentSong .details .author');
	if (song.thumbnail) {
		thumbnail.setAttribute('src', song.thumbnail);
	} else {
		thumbnail.setAttribute('src', 'C:/Repositories/soundboard/styles/no-thmb.png');
	}
	title.textContent = songName;
	author.textContent = song.author;
	const controls = playing.querySelector('.buttons');
	const progressBar = playing.querySelector('input.progress');
	progressBar.value = 0;
	const before = controls.querySelector('.before');
	const play = controls.querySelector('.play');
	const after = controls.querySelector('.after');

	before.replaceWith(before.cloneNode(true));
	play.replaceWith(play.cloneNode(true));
	after.replaceWith(after.cloneNode(true));

	const newBefore = controls.querySelector('.before');
	const newPlay = controls.querySelector('.play');
	const newAfter = controls.querySelector('.after');

	newBefore.addEventListener('click', () => {
		if (audio.currentTime / audio.duration > 0.25) {
			audio.currentTime = 0;
		} else {
			loadLast(song);
		}
	});

	newPlay.addEventListener('click', () => playSong(song));
	newAfter.addEventListener('click', () => loadNext(song));

	audio.addEventListener('timeupdate', () => {
		progressBar.value = audio.currentTime / audio.duration || 0;
	});

	progressBar.addEventListener('input', () => {
		audio.currentTime = progressBar.value * audio.duration;
	});
}

function loadNext(song) {
	if (!getSong(song.id)) {
		stopSong(0);
		console.error('There is no next song');
		return;
	}
	const loopState = document.querySelector('#content-songs .buttons .loop').getAttribute('data-state');
	const nextSong = getSong(getSongElement(song.id).nextElementSibling?.getAttribute('data-track-id'));
	const songs = document.querySelectorAll('#songList .song');
	const firstSong = getSong(songs[0].getAttribute('data-track-id'));
	const songIsLast = !nextSong;

	const getNextid = () => {
		if (loopState === 'song') {
			stopSong(0);
			return song;
		} else if (songIsLast) {
			return loopState === 'list' ? firstSong : null;
		} else {
			return nextSong;
		}
	};

	const nextid = getNextid();
	if (nextid) {
		playSong(nextid);
	}
}

function loadLast(song) {
	const loopState = document.querySelector('#content-songs .buttons .loop').getAttribute('data-state');
	const lastSong = getSong(getSongElement(song.id).previousElementSibling?.getAttribute('data-track-id'));
	const songIsFirst = !lastSong;

	stopSong(0);

	const getLastid = () => {
		if (loopState === 'song') {
			return song;
		} else if (songIsFirst) {
			return loopState === 'list' ? allSongs[allSongs.length - 1] : null;
		} else {
			return lastSong;
		}
	};

	const lastid = getLastid();
	if (lastid) {
		playSong(lastid);
	}
}

window.electron.ipcRenderer.on('media-play-pause', () => {
	const audio = document.getElementById('song');
	const song = allSongs.filter((song) => song.id === audio.getAttribute('data-track-id'))[0];
	playSong(song);
});

window.electron.ipcRenderer.on('media-next', () => {
	const audio = document.getElementById('song');
	const song = allSongs.filter((song) => song.id === audio.getAttribute('data-track-id'))[0];
	loadNext(song);
});

window.electron.ipcRenderer.on('media-previous', () => {
	const audio = document.getElementById('song');
	const song = allSongs.filter((song) => song.id === audio.getAttribute('data-track-id'))[0];
	loadLast(song);
});

window.electron.ipcRenderer.on('media-stop', () => {
	stopSong();
});

initializeSongPage();
