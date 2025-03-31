function openTab(tabName) {
    const contentTab = document.getElementById(`content-${tabName}`);
    const contentTabs = document.querySelectorAll('.contentTab');

    contentTabs.forEach((tab)=>{
        tab.classList.remove('open');
    });

    contentTab.classList.add('open');

    const listTab = document.getElementById(`list-${tabName}`);
    const listTabs = document.querySelectorAll('.listTab');

    listTabs.forEach((tab)=>{
        tab.classList.remove('open');
    });

    listTab.classList.add('open');
}