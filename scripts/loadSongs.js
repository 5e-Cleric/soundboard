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

	loadSongs('All');
}

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

	const allAudios = document.querySelectorAll('#audioList audio');
	allAudios.forEach((audio) => (audio.volume = value));

	if (store) {
		localStorage.setItem(`song-volume`, value);
	}
}

function loadSongs(list) {
	const songList = document.getElementById('songList');
	const audioList = document.getElementById('audioList');
	const template = document.getElementById('songTemplate');

	window.electron.ipcRenderer.invoke('get-songs', list).then((songs) => {
		//console.log(songs.length, ' songs loaded');
		songList.textContent = '';
		audioList.textContent = '';

		if (songs.length === 0) {
			let noSongs = document.createElement('div');
			noSongs.innerHTML = `<p>You may add more songs adding them inside the songs directory in your downloads folder.</p>`;
			songList.appendChild(noSongs);
		}

		songs.forEach((song) => {
			const { name, source, author, album, trackNumber, duration } = song;
			const songName = name.split('.')[0];
			const trackId = `${trackNumber}-${songName}`;
			const durationWithUnits = formatDuration(duration);

			const songElement = template.content.cloneNode(true);
			const templateNumber = songElement.querySelector('.number');
			const templateButton = songElement.querySelector('button');
			const templateTitle = songElement.querySelector('.title');
			const templateAuthor = songElement.querySelector('.author');
			const templateAlbum = songElement.querySelector('.album');
			const templateDuration = songElement.querySelector('.duration');

			songElement.querySelector('.song').setAttribute('data-track-id', trackId);
			templateButton.addEventListener('click', () => playSong(trackId));

			templateNumber.textContent = trackNumber;
			templateTitle.textContent = songName;
			templateAuthor.textContent = author;
			templateAlbum.textContent = album;
			templateDuration.textContent = durationWithUnits;

			songList.appendChild(songElement);
			const audioElement = `<audio src="${source}" data-track-id="${trackId}"></audio>`;
			audioList.innerHTML += audioElement;
		});

		const savedVolume = localStorage.getItem(`song-volume`);
		savedVolume != null && changeVolume(savedVolume);
	});
}

function stopSong(trackId, time) {
	let audio = getAudio(trackId);

	if (time !== undefined) {
		audio.currentTime = time;
	}
	audio.pause();

	const song = getSong(trackId);
	song.classList.remove('playing');
	const buttonIcon = song.querySelector(`button i`);
	buttonIcon.classList.remove('fa-pause');
	buttonIcon.classList.add('fa-play');

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

function playSong(trackId) {
	let clickedAudio = getAudio(trackId);
	if (!clickedAudio) {
		console.warn(`No audio found for: ${songName}`);
		return;
	}
	const isPlaying = !clickedAudio.paused;
	if (isPlaying) {
		stopSong(trackId);
	} else {
		const allSongs = document.querySelectorAll('#audioList audio');
		allSongs.forEach((audio) => {
			if (audio !== clickedAudio && !audio.paused) {
				stopSong(audio.getAttribute('data-track-id'), 0);
			}
		});

		loadControls(trackId);
		setTimeout(() => clickedAudio.play(), 50);

		const song = getSong(trackId);
		song.classList.add('playing');
		const buttonIcon = song.querySelector(`button i`);
		buttonIcon.classList.remove('fa-play');
		buttonIcon.classList.add('fa-pause');
		const playIcon = document.querySelector('#content-songs .buttons .play i');
		playIcon.classList.remove('fa-play');
		playIcon.classList.add('fa-pause');

		clickedAudio.addEventListener('ended', () => loadNext(trackId));
	}
}

function getAudio(trackId) {
	return document.querySelector(`#audioList audio[data-track-id="${trackId}"]`);
}

function getSong(trackId) {
	return document.querySelector(`#songList .song[data-track-id="${trackId}"]`);
}

function loadControls(trackId) {
	let audio = getAudio(trackId);
	if (!audio) return;

	const playing = document.querySelector('#content-songs .playing');
	const title = playing.querySelector('.currentSong .details .title');
	const author = playing.querySelector('.currentSong .details .author');

	title.textContent = getSong(trackId).querySelector('.title').textContent;
	author.textContent = getSong(trackId).querySelector('.author').textContent;
	const controls = playing.querySelector('.buttons');
	const progressBar = playing.querySelector('input.progress');

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
		if ((audio.currentTime / audio.duration) > 0.25) {
			audio.currentTime = 0;
		} else {
			loadLast(trackId);
		}
	});

	newPlay.addEventListener('click', () => playSong(trackId));
	newAfter.addEventListener('click', () => loadNext(trackId));

	audio.addEventListener('timeupdate', () => {
		progressBar.value = audio.currentTime / audio.duration;
	});

	progressBar.addEventListener('input', () => {
		audio.currentTime = progressBar.value * audio.duration;
	});
}

function loadNext(trackId) {
	const loopState = document.querySelector('#content-songs .buttons .loop').getAttribute('data-state');
	const songList = document.querySelectorAll('#songList .song');
	const nextSong = getSong(trackId).nextElementSibling;
	const songIsLast = !nextSong;

	stopSong(trackId, 0);

	const getNextTrackId = () => {
		if (loopState === 'song') {
			return trackId;
		} else if (songIsLast) {
			return loopState === 'list' ? songList[0].getAttribute('data-track-id') : null;
		} else {
			return nextSong.getAttribute('data-track-id');
		}
	};

	const nextTrackId = getNextTrackId();
	if (nextTrackId) {
		playSong(nextTrackId);
	}
}

function loadLast(trackId) {
	const loopState = document.querySelector('#content-songs .buttons .loop').getAttribute('data-state');
	const songList = document.querySelectorAll('#songList .song');
	const lastSong = getSong(trackId).previousElementSibling;
	const songIsFirst = !lastSong;

	console.log(lastSong);
	stopSong(trackId, 0);

	const getLastTrackId = () => {
		if (loopState === 'song') {
			return trackId;
		} else if (songIsFirst) {
			return loopState === 'list' ? songList[songList.length-1].getAttribute('data-track-id') : null;
		} else {
			return lastSong.getAttribute('data-track-id');
		}
	};

	const lastTrackId = getLastTrackId();
	if (lastTrackId) {
		playSong(lastTrackId);
	}
}

initializeSongPage();
