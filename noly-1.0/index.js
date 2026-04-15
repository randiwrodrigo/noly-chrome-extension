document.addEventListener('DOMContentLoaded', () => {

    const addBtn = document.querySelector('.add-tab-btn');
    const titleInput = document.getElementById('titleInput');
    const descInput = document.getElementById('descInput');
    const searchInput = document.querySelector('.search-bar input');
    const tabList = document.querySelector('.tab-list');

    let tabs = [];

    // UTILITIES

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    function sanitise(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showStorageError() {
        tabList.innerHTML = "<p class='no-tabs-msg'>Storage unavailable. Please reload the extension.</p>";
    }

    // STORAGE

    function save(callback) {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            showStorageError();
            return;
        }
        chrome.storage.local.set({ tabs }, () => {
            if (chrome.runtime.lastError) {
                console.error('Save failed:', chrome.runtime.lastError);
            }
            if (typeof callback === 'function') callback();
        });
    }

    function load(callback) {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            showStorageError();
            return;
        }
        chrome.storage.local.get(['tabs'], (result) => {
            if (chrome.runtime.lastError) {
                console.error('Load failed:', chrome.runtime.lastError);
                showStorageError();
                return;
            }
            tabs = result.tabs || [];
            if (typeof callback === 'function') callback();
        });
    }

    // GET CURRENT TAB

    function getCurrentTab(callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, (chromeTabs) => {
            if (chrome.runtime.lastError || !chromeTabs || chromeTabs.length === 0) {
                console.error('Could not get current tab:', chrome.runtime.lastError);
                return;
            }
            callback(chromeTabs[0]);
        });
    }

    // FIND TAB BY ID (safe — avoids stale index bugs)

    function findTabById(id) {
        return tabs.findIndex(t => t.id === id);
    }

    // RENDER

    function renderTabs(filter = '') {
        tabList.innerHTML = '';

        if (tabs.length === 0) {
            tabList.innerHTML = "<p class='no-tabs-msg'>No saved tabs yet</p>";
            return;
        }

        const filteredTabs = tabs.filter(tab =>
            tab.title.toLowerCase().includes(filter.toLowerCase()) ||
            (tab.description && tab.description.toLowerCase().includes(filter.toLowerCase()))
        );

        if (filteredTabs.length === 0) {
            tabList.innerHTML = "<p class='no-tabs-msg'>No tabs found</p>";
            return;
        }

        filteredTabs.forEach((tab) => {
            const tabItem = document.createElement('div');
            tabItem.className = 'tab-item';
            tabItem.dataset.id = tab.id;

            const tabMain = document.createElement('div');
            tabMain.className = 'tab-main';

            const tabTitle = document.createElement('span');
            tabTitle.className = 'tab-title';
            tabTitle.textContent = tab.title;          // textContent — safe, no XSS

            const tabActions = document.createElement('div');
            tabActions.className = 'tab-actions';

            const expandBtn = document.createElement('button');
            expandBtn.className = 'expand-btn';
            expandBtn.textContent = '▶';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = 'Edit';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';

            tabActions.append(expandBtn, editBtn, deleteBtn);
            tabMain.append(tabTitle, tabActions);

            const tabDetails = document.createElement('div');
            tabDetails.className = 'tab-details';
            tabDetails.textContent = tab.description || 'No description'; // textContent — safe

            tabItem.append(tabMain, tabDetails);

            // OPEN TAB
            tabTitle.addEventListener('click', () => {
                chrome.tabs.create({ url: tab.url });
            });

            // DELETE
            deleteBtn.addEventListener('click', () => {
                const idx = findTabById(tab.id);
                if (idx === -1) return;
                tabs.splice(idx, 1);
                save(() => renderTabs(filter));
            });

            // EXPAND
            expandBtn.addEventListener('click', function () {
                tabDetails.classList.toggle('active');
                this.textContent = tabDetails.classList.contains('active') ? '▼' : '▶';
            });

            // EDIT
            editBtn.addEventListener('click', () => {
                const editUI = document.createElement('div');
                editUI.className = 'edit-ui';

                const editTitleInput = document.createElement('input');
                editTitleInput.type = 'text';
                editTitleInput.className = 'edit-title';
                editTitleInput.value = tab.title;

                const editDescTextarea = document.createElement('textarea');
                editDescTextarea.className = 'edit-desc';
                editDescTextarea.value = tab.description || '';

                const editActions = document.createElement('div');

                const saveBtn = document.createElement('button');
                saveBtn.className = 'save-btn';
                saveBtn.textContent = 'Save';

                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'cancel-btn';
                cancelBtn.textContent = 'Cancel';

                editActions.append(saveBtn, cancelBtn);
                editUI.append(editTitleInput, editDescTextarea, editActions);
                tabItem.innerHTML = '';
                tabItem.appendChild(editUI);

                saveBtn.addEventListener('click', () => {
                    const newTitle = editTitleInput.value.trim();
                    const newDesc = editDescTextarea.value.trim();
                    const idx = findTabById(tab.id);
                    if (idx === -1) return;

                    tabs[idx].title = newTitle || tab.title;
                    tabs[idx].description = newDesc;
                    save(() => renderTabs(filter));
                });

                cancelBtn.addEventListener('click', () => {
                    renderTabs(filter);
                });
            });

            tabList.appendChild(tabItem);
        });
    }

    // ADD TAB

    addBtn.addEventListener('click', () => {
        getCurrentTab((currentTab) => {
            const title = titleInput.value.trim() || currentTab.title;
            const description = descInput.value.trim();
            const url = currentTab.url;

            if (!title) {
                alert('Title required');
                return;
            }

            // PREVENT DUPLICATES
            const isDuplicate = tabs.some(t => t.url === url);
            if (isDuplicate) {
                const overwrite = confirm('This URL is already saved. Add it again?');
                if (!overwrite) return;
            }

            tabs.push({
                id: generateId(),    // stable ID — avoids stale index bugs
                title,
                description,
                url,
                savedAt: Date.now()
            });

            save(() => renderTabs());

            titleInput.value = '';
            descInput.value = '';
        });
    });

    // SEARCH
    searchInput.addEventListener('input', (e) => {
        renderTabs(e.target.value);
    });

    // INITIAL LOAD
    load(() => {
        renderTabs();
    });

});