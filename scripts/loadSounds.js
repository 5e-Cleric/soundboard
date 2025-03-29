function loadSounds(list) {
	const soundGrid = document.getElementById('soundGrid');
	const template = document.getElementById('soundTemplate');

	window.electron.ipcRenderer.invoke('get-sounds', list).then((sounds) => {
		console.log(sounds.length, ' sounds loaded');
		soundGrid.textContent = '';

		if (sounds.length === 0) {
			let noSounds = document.createElement('div');
			noSounds.innerHTML = `<p>You may add more sounds adding them inside the sounds directory in your downloads folder.</p>`;
			soundGrid.appendChild(noSounds);
		}

		sounds.forEach((sound) => {
			const soundName = sound.split('\\').pop().split('.')[0];

			const soundElement = template.content.cloneNode(true);
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

			soundGrid.appendChild(soundElement);
		});
	});
}

function playSound(soundName) {
	const clickedAudio = document.querySelector(`[src*="${soundName}"]`);
	const soundGrid = document.getElementById('soundGrid');

	if (!clickedAudio) {
		console.warn(`No audio found for: ${soundName}`);
		return;
	}
	clickedAudio.pause();
	clickedAudio.currentTime = 0;

	const allAudios = soundGrid.querySelectorAll('audio');
	allAudios.forEach((audioElement) => {
		if (audioElement !== clickedAudio) {
			audioElement.pause(); // Pause any other audio that's playing
			audioElement.currentTime = 0; // Reset the audio to the beginning
		}
	});

	clickedAudio.play();
}

function getRandomColor() {
	const HUE_RANGE = 360;
	const SATURATION_MIN = 70;
	const SATURATION_MAX = 90;
	const LIGHTNESS_MIN = 70;
	const LIGHTNESS_MAX = 80;

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

	return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

loadSounds('All');
