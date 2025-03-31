function initializeSongPage() {
	const loop = document.querySelector('#content-songs .buttons .loop');
	const shuffle = document.querySelector('#content-songs .buttons .shuffle');

	const loopState = localStorage.getItem('loop-state') || 'none';
	loop.setAttribute('data-state', loopState);
	updateLoopUI(loopState, loop);

	loop.addEventListener('click', () => toggleLoop(loop));
	shuffle.addEventListener('click', (e) => e.target.classList.toggle('active'));

	const savedVolume = localStorage.getItem('song-volume');
	changeVolume(savedVolume);

	const volumeElement = document.querySelector('#content-songs .volume input');
	volumeElement.addEventListener('input', (e) => changeVolume(e.target.value, true));

	loadSongs('All');
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

	if (time !== undefined) {
		audio.currentTime = time;
	}
	audio.pause();

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

		clickedAudio.addEventListener('ended', () => loadNext(trackId));
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

function loadNext(trackId) {
	const loopState = document.querySelector('#content-songs .buttons .loop').getAttribute('data-state');
	const shuffleState = document.querySelector('#content-songs .buttons .shuffle').classList.contains('active');
	const songList = document.querySelectorAll('#songList .song');
	const audio = document.querySelector(`#songList [data-track-id="${trackId}"] audio`);
	const nextSong = audio.parentElement.nextElementSibling;
	const songIsLast = !nextSong;

	stopSong(trackId, 0);

	const getNextTrackId = () => {
		if (loopState === 'song') {
			return trackId;
		} else if (shuffleState) {
			const randomIndex = Math.floor(Math.random() * songList.length);
			return songList[randomIndex].getAttribute('data-track-id');
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

initializeSongPage();
