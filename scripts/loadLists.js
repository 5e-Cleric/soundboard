function loadLists() {
	const soundList = document.querySelector('#list-sounds ul');
	const songsList = document.querySelector('#list-songs ul');
	const template = document.getElementById('listTemplate');

	soundList.textContent = '';
	songsList.textContent = '';

	window.electron.ipcRenderer.invoke('get-subdirectories', 'sounds').then((folders) => {
		let All = document.createElement('li');
		All.innerHTML = `<button onclick="loadSounds('All')">All</button>`;
		soundList.appendChild(All);

		if (folders.length === 0) {
			let noLists = document.createElement('li');
			noLists.innerHTML = `<p>You may add more lists adding folders inside the sounds directory in your downloads folder.</p>`;
			soundList.appendChild(noLists);
		}
		folders.forEach((folder) => {
			const listElement = template.content.cloneNode(true);
			const button = listElement.querySelector('button');

			button.textContent = folder;
			button.setAttribute('data-color', getRandomColor());
			button.addEventListener('click', () => loadSounds(folder));

			soundList.appendChild(listElement);
		});
	});

	window.electron.ipcRenderer.invoke('get-subdirectories', 'songs').then((folders) => {
		let All = document.createElement('li');
		All.innerHTML = `<button onclick="loadSongs('All')">All</button>`;
		songsList.appendChild(All);

		if (folders.length === 0) {
			let noLists = document.createElement('li');
			noLists.innerHTML = `<p>You may add more lists adding folders inside the songs directory in your downloads folder.</p>`;
			songsList.appendChild(noLists);
		}
		folders.forEach((folder) => {
			const listElement = template.content.cloneNode(true);
			const button = listElement.querySelector('button');

			button.textContent = folder;
			button.setAttribute('data-color', getRandomColor());
			button.addEventListener('click', () => loadSongs(folder));

			songsList.appendChild(listElement);
		});
	});
}

loadLists();
