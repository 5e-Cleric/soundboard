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

	const audio = document.getElementById('song');
	audio.volume = value;

	if (store) {
		localStorage.setItem(`song-volume`, value);
	}
}

function loadSongs(list) {
	const songList = document.getElementById('songList');
	const template = document.getElementById('songTemplate');

	songList.classList.add('shuffling');

	window.electron.ipcRenderer.invoke('get-songs', list).then((list) => {
		songList.textContent = '';

		const songs = list.files;

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
		});

		const randomSong = songs[Math.floor(Math.random() * songs.length)];
		console.log(songs, randomSong);
		if (randomSong) loadControls(randomSong);

		setTimeout(() => songList.classList.remove('shuffling'), 500);
	});
}

function stopSong(time) {
	const audio = document.getElementById('song');

	if (time !== undefined) {
		audio.currentTime = time;
	}
	audio.pause();

	const songElement = getSong(audio.getAttribute(`data-track-id`));
	songElement.classList.remove('playing');
	const buttonIcon = songElement.querySelector(`button i`);
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

function playSong(id, source) {
	const audio = document.getElementById('song');
	audio.setAttribute('data-track-id', id);
	audio.setAttribute('source', source);

	const isPlaying = !audio.paused;
	if (isPlaying) {
		stopSong();
	} else {
		loadControls(song);
		setTimeout(() => audio.play(), 50);

		const songElement = getSong(id);
		songElement.classList.add('playing');
		const buttonIcon = songElement.querySelector(`button i`);
		buttonIcon.classList.remove('fa-play');
		buttonIcon.classList.add('fa-pause');
		const playIcon = document.querySelector('#content-songs .buttons .play i');
		playIcon.classList.remove('fa-play');
		playIcon.classList.add('fa-pause');

		audio.addEventListener('ended', () => loadNext(song));
	}
}

function getSong(id) {
	return document.querySelector(`#songList .song[data-track-id="${id}"]`);
}

function loadControls(song) {
	const audio = document.getElementById('song');

	const playing = document.querySelector('#content-songs .playing');
	const thumbnail = document.querySelector('.currentSong .thumbnail');
	const title = playing.querySelector('.currentSong .details .title');
	const author = playing.querySelector('.currentSong .details .author');

	console.log(song);
	if (thumbnail) thumbnail.setAttribute('src', song.thumbnail);
	title.textContent = song.name;
	author.textContent = song.author;
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
		if (audio.currentTime / audio.duration > 0.25) {
			audio.currentTime = 0;
		} else {
			loadLast(song);
		}
	});

	newPlay.addEventListener('click', () => playSong(song));
	newAfter.addEventListener('click', () => loadNext(song));

	audio.addEventListener('timeupdate', () => {
		progressBar.value = audio.currentTime / audio.duration;
	});

	progressBar.addEventListener('input', () => {
		audio.currentTime = progressBar.value * audio.duration;
	});
}

function loadNext(song) {
	const loopState = document.querySelector('#content-songs .buttons .loop').getAttribute('data-state');
	const songList = document.querySelectorAll('#songList .song');
	const nextSong = getSong(song.id).nextElementSibling;
	const songIsLast = !nextSong;

	stopSong(0);

	const getNextid = () => {
		if (loopState === 'song') {
			return song.id, song.source;
		} else if (songIsLast) {
			return loopState === 'list'
				? (songList[0].getAttribute('data-track-id'), songList[0].getAttribute('data-source'))
				: null;
		} else {
			return nextSong.getAttribute('data-track-id'), nextSong.getAttribute('data-source');
		}
	};

	const nextid = getNextid();
	if (nextid) {
		playSong(nextid);
	}
}

function loadLast(song) {
	const loopState = document.querySelector('#content-songs .buttons .loop').getAttribute('data-state');
	const songList = document.querySelectorAll('#songList .song');
	const lastSong = getSong(song.id).previousElementSibling;
	const songIsFirst = !lastSong;

	stopSong(0);

	const getLastid = () => {
		if (loopState === 'song') {
			return song.id, song.source;
		} else if (songIsFirst) {
			return loopState === 'list'
				? (songList[songList.length - 1].getAttribute('data-track-id'), lastSong.getAttribute('data-source'))
				: null;
		} else {
			return lastSong.getAttribute('data-track-id'), lastSong.getAttribute('data-source');
		}
	};

	const lastid = getLastid();
	if (lastid) {
		playSong(lastid);
	}
}

initializeSongPage();
