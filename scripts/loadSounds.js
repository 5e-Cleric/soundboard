function createListElement(listName) {
	const div = document.createElement('div');
	div.className = `list ${listName}`;
	div.setAttribute('data-color', getRandomColor(360, 20, 40, 40, 50, 40));
	const title = document.createElement('h3');
	title.textContent = listName;
	div.appendChild(title);
	return div;
}

function appendSoundToList(listDiv, sound) {
	const soundName = sound.split('\\').pop().split('.')[0];

	const soundElement = document.getElementById('soundTemplate').content.cloneNode(true);
	const button = soundElement.querySelector('button');
	const audio = soundElement.querySelector('audio');
	const slider = soundElement.querySelector('input');
	const savedVolume = localStorage.getItem(`volume-${soundName}`);
	audio.setAttribute('src', sound);
	savedVolume != null && (audio.volume = savedVolume);
	savedVolume != null && (slider.value = savedVolume);
	savedVolume != null && (slider.nextElementSibling.textContent = `${Math.round(savedVolume * 100)}%`);

	button.textContent = soundName;
	button.setAttribute('data-color', getRandomColor());
	button.addEventListener('click', () => playSound(soundName));

	slider.addEventListener('input', (event) => {
		slider.nextElementSibling.textContent = `${Math.round(slider.value * 100)}%`;
		const volume = event.target.value;
		localStorage.setItem(`volume-${soundName}`, volume);
		audio.volume = volume;
	});

	listDiv.appendChild(soundElement);
}

function loadSounds(list) {
	const soundGrid = document.getElementById('soundGrid');

	window.electron.ipcRenderer.invoke('get-sounds', list).then((sounds) => {
		//console.log(sounds.length, ' sounds loaded');
		soundGrid.textContent = '';

		if (sounds.length === 0) {
			let noSounds = document.createElement('div');
			noSounds.innerHTML = `<p>You may add more sounds by adding them inside the sounds directory in your music folder.</p>`;
			soundGrid.appendChild(noSounds);
		}

		if (list !== 'All') {
			sounds.forEach((sound) => {
				const listDiv = createListElement('Default');
				appendSoundToList(listDiv, sound);
				soundGrid.appendChild(listDiv);
			});
		} else {
			let lists = [];
			sounds.forEach((sound) => {
				const parts = sound.split(/[\\/]/);
				const folderName = parts[parts.length - 2];
				const existing = lists.find((l) => l.listName === folderName);
				if (existing) {
					existing.sounds.push(sound);
				} else {
					lists.push({ listName: folderName, sounds: [sound] });
				}
			});
			console.table(lists);

			lists.forEach((list) => {
				const listDiv = createListElement(list.listName);
				soundGrid.appendChild(listDiv);

				list.sounds.forEach((sound) => {
					appendSoundToList(listDiv, sound);
				});
			});
		}
	});
}


function playSound(soundName) {
	let clickedAudio = document.querySelector(`[src$="${soundName}.mp3"]`);
	const soundGrid = document.getElementById('soundGrid');
	const soundNameIsDuplicated = `${soundName}.mp3` !== clickedAudio.getAttribute('src').split('\\').pop();

	if (soundNameIsDuplicated) {
		const coincidentAudios = document.querySelectorAll(`[src$="${soundName}.mp3"]`);
		clickedAudio = [...coincidentAudios].filter(
			(audio) => `${soundName}.mp3` === audio.getAttribute('src').split('\\').pop()
		);
		clickedAudio = clickedAudio[0];
	}

	if (!clickedAudio) {
		console.warn(`No audio found for: ${soundName}`);
		return;
	}

	clickedAudio.pause();
	clickedAudio.currentTime = 0;

	// Pause and reset all other playing sounds
	const allAudios = soundGrid.querySelectorAll('audio');
	allAudios.forEach((audioElement) => {
		if (audioElement !== clickedAudio) {
			audioElement.pause();
			audioElement.currentTime = 0;
		}
	});

	clickedAudio.play();
}

function getRandomColor(hRange, sMin, sMax, lMin, lMax, o) {
	const HUE_RANGE = hRange || 360;
	const SATURATION_MIN = sMin || 70;
	const SATURATION_MAX = sMax || 90;
	const LIGHTNESS_MIN = lMin || 70;
	const LIGHTNESS_MAX = lMax || 80;
	const opacity = o || 100;

	const hue = Math.random() * HUE_RANGE;
	const saturation = SATURATION_MIN + Math.random() * (SATURATION_MAX - SATURATION_MIN);
	const lightness = LIGHTNESS_MIN + Math.random() * (LIGHTNESS_MAX - LIGHTNESS_MIN);

	const h = hue / 360,
		s = saturation / 100,
		l = lightness / 100;
	const f = (p, q, t) =>
		t < 0
			? t + 1
			: t > 1
			? t - 1
			: t < 1 / 6
			? p + (q - p) * 6 * t
			: t < 1 / 2
			? q
			: t < 2 / 3
			? p + (q - p) * (2 / 3 - t) * 6
			: p;
	const q = l + s - l * s,
		p = 2 * l - q;

	const r = Math.round(f(p, q, h + 1 / 3) * 255);
	const g = Math.round(f(p, q, h) * 255);
	const b = Math.round(f(p, q, h - 1 / 3) * 255);

	return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}${Math.round(opacity * 2.55).toString(16).padStart(2, '0')}`

}

loadSounds('All');
