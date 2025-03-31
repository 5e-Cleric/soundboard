function loadSongs(list) {
	const songList = document.getElementById('songList');
	const template = document.getElementById('songTemplate');

	window.electron.ipcRenderer.invoke('get-songs', list).then((songs) => {
		console.log(songs.length, ' songs loaded');
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

			const savedVolume = localStorage.getItem(`song-volume`);

			songElement.querySelector('.song').setAttribute('data-track-id', trackId);

			templateAudio.setAttribute('src', source);
			savedVolume != null && (templateAudio.volume = savedVolume);

			templateButton.addEventListener('click', () => playSong(trackId));

			templateNumber.textContent = trackNumber;
			templateTitle.textContent = songName;
			templateAuthor.textContent = author;
			templateAlbum.textContent = album;
			templateDuration.textContent = durationWithUnits;

			songList.appendChild(songElement);
		});
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
	if (!clickedAudio.paused) {
		console.log('it was not paused');
		clickedAudio.pause();
		const buttonIcon = document.querySelector(`#songList [data-track-id="${trackId}"] button i`);
		buttonIcon.classList.remove('fa-pause');
		buttonIcon.classList.add('fa-play');
	} else {
		const allSongs = document.querySelectorAll('#songList .song');
		allSongs.forEach((song) => {
			const audio = song.querySelector('audio');
			if (audio !== clickedAudio && !audio.paused) {
				audio.pause();
				audio.currentTime = 0;
				song.querySelector('button i').classList.remove('fa-pause');
				song.querySelector('button i').classList.add('fa-play');
			}
		});

		clickedAudio.play();

		const buttonIcon = document.querySelector(`#songList [data-track-id="${trackId}"] button i`);
		buttonIcon.classList.remove('fa-play');
		buttonIcon.classList.add('fa-pause');
	}
}

loadSongs('All');
