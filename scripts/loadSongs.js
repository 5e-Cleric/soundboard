function initializeSongPage() {
	const loop = document.querySelector('#content-songs .buttons .loop');
	const shuffle = document.querySelector('#content-songs .buttons .shuffle');

	loop.addEventListener('click', (e) => {
		e.target.classList.toggle('active');
	});
	shuffle.addEventListener('click', (e) => {
		e.target.classList.toggle('active');
	});

	const volumeElement = document.querySelector('#content-songs .volume input');
	const savedVolume = localStorage.getItem(`song-volume`);
	changeVolume(savedVolume);

	const muteButton = document.querySelector('#content-songs .volume .mute');

	muteButton.addEventListener('click', () => {
		const savedVolume = localStorage.getItem(`song-volume`);
		if (volumeElement.value != 0) {
			changeVolume(0);
		} else if (savedVolume) {
			changeVolume(savedVolume);
		}
	});

	volumeElement.addEventListener('input', (event) => {
		const volume = event.target.value;
		changeVolume(volume, true);
	});

	loadSongs('All');
}

function changeVolume(value, store) {
	const volumeElement = document.querySelector('#content-songs .volume input');
	const volSymbol = volumeElement.previousElementSibling.querySelector('i');

	volumeElement.nextElementSibling.textContent = `${Math.round(value * 100)}%`;
	volumeElement.value = value;

	if (value > 0.5) volSymbol.classList = 'fa fa-volume-high';
	if (value < 0.5) volSymbol.classList = 'fa fa-volume-low';
	if (value === 0) volSymbol.classList = 'fa fa-volume-xmark';

	const allAudios = document.querySelectorAll('.song audio');
	allAudios.forEach((audio) => (audio.volume = value));

	if (store) {
		localStorage.setItem(`song-volume`, value);
	}
}

function stopSong(trackId, time) {
	let audio = document.querySelector(`#songList [data-track-id="${trackId}"] audio`);

	audio.pause();
	if (time) {
		audio.currentTime = time;
	}
	const buttonIcon = document.querySelector(`#songList [data-track-id="${trackId}"] button i`);
	buttonIcon.classList.remove('fa-pause');
	buttonIcon.classList.add('fa-play');
	const playIcon = document.querySelector('#content-songs .buttons .play i');
	playIcon.classList.remove('fa-pause');
	playIcon.classList.add('fa-play');
}

function loadSongs(list) {
	const songList = document.getElementById('songList');
	const template = document.getElementById('songTemplate');

	window.electron.ipcRenderer.invoke('get-songs', list).then((songs) => {
		//console.log(songs.length, ' songs loaded');
		songList.textContent = '';

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
			const templateAudio = songElement.querySelector('audio');
			const templateTitle = songElement.querySelector('.title');
			const templateAuthor = songElement.querySelector('.author');
			const templateAlbum = songElement.querySelector('.album');
			const templateDuration = songElement.querySelector('.duration');

			songElement.querySelector('.song').setAttribute('data-track-id', trackId);

			templateAudio.setAttribute('src', source);
			templateButton.addEventListener('click', () => playSong(trackId));

			templateNumber.textContent = trackNumber;
			templateTitle.textContent = songName;
			templateAuthor.textContent = author;
			templateAlbum.textContent = album;
			templateDuration.textContent = durationWithUnits;

			songList.appendChild(songElement);
		});

		const savedVolume = localStorage.getItem(`song-volume`);
		savedVolume != null && changeVolume(savedVolume);
	});
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
	let clickedAudio = document.querySelector(`#songList [data-track-id="${trackId}"] audio`);
	if (!clickedAudio) {
		console.warn(`No audio found for: ${songName}`);
		return;
	}
	const isPlaying = !clickedAudio.paused;
	if (isPlaying) {
		stopSong(trackId);
	} else {
		const allSongs = document.querySelectorAll('#songList .song');
		allSongs.forEach((song) => {
			const audio = song.querySelector('audio');
			if (audio !== clickedAudio && !audio.paused) {
				stopSong(song.getAttribute('data-track-id'), 0);
			}
		});

		loadControls(trackId);
		setTimeout(() => clickedAudio.play(), 50);

		const buttonIcon = document.querySelector(`#songList [data-track-id="${trackId}"] button i`);
		buttonIcon.classList.remove('fa-play');
		buttonIcon.classList.add('fa-pause');
		const play = document.querySelector('#content-songs .buttons .play i');
		play.classList.remove('fa-play');
		play.classList.add('fa-pause');
	}
}

function loadControls(trackId) {
	let audio = document.querySelector(`#songList [data-track-id="${trackId}"] audio`);
	if (!audio) return;

	const controls = document.querySelector('#content-songs .buttons');
	const progressBar = document.querySelector('input.progress');

	const before = controls.querySelector('.before');
	const play = controls.querySelector('.play');
	const after = controls.querySelector('.after');

	before.replaceWith(before.cloneNode(true));
	play.replaceWith(play.cloneNode(true));
	after.replaceWith(after.cloneNode(true));

	const newBefore = controls.querySelector('.before');
	const newPlay = controls.querySelector('.play');
	const newAfter = controls.querySelector('.after');

	const audioBefore = audio.parentElement.previousElementSibling;
	const audioAfter = audio.parentElement.nextElementSibling;

	newBefore.addEventListener('click', () => {
		if (audioBefore) {
			playSong(audioBefore.getAttribute('data-track-id'));
		} else {
			stopSong(trackId, 0);
		}
	});

	newPlay.addEventListener('click', () => playSong(trackId));

	newAfter.addEventListener('click', () => {
		if (audioAfter) {
			playSong(audioAfter.getAttribute('data-track-id'));
		} else {
			stopSong(trackId, 1);
		}
	});

	audio.addEventListener('timeupdate', () => {
		progressBar.value = audio.currentTime / audio.duration;
	});

	progressBar.addEventListener('input', () => {
		audio.currentTime = progressBar.value * audio.duration;
	});
}

function loadNext() {
	const loop = document.querySelector('#content-songs .buttons .loop');
	const shuffle = document.querySelector('#content-songs .buttons .shuffle');
}

initializeSongPage();
