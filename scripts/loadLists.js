function loadLists() {
	const listsList = document.getElementById('lists');
	const template = document.getElementById('listTemplate');

	window.electron.ipcRenderer.invoke('get-subdirectories').then((folders) => {
		lists.textContent = '';
		let All = document.createElement('li');
		All.innerHTML = `<button onclick="loadSounds('All')">All</button>`;
		listsList.appendChild(All);

		if (folders.length === 0) {
			let noLists = document.createElement('li');
			noLists.innerHTML = `<p>You may add more lists adding folders inside the sounds directory in your downloads folder.</p>`;
			listsList.appendChild(noLists);
		}
		folders.forEach((folder) => {
			const listElement = template.content.cloneNode(true);
			const button = listElement.querySelector('button');

			button.textContent = folder;
			button.setAttribute('data-color', getRandomColor());
			button.addEventListener('click', () => loadSounds(folder));

			listsList.appendChild(listElement);
		});
	});
}

loadLists();
