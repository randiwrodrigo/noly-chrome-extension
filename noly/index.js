document.addEventListener('DOMContentLoaded', () => {

    const addBtn = document.querySelector('.add-tab-btn');
    const titleInput = document.getElementById('titleInput');
    const descInput = document.getElementById('descInput');
    const searchInput = document.querySelector('.search-bar input');
    const tabList = document.querySelector('.tab-list');

    let tabs = JSON.parse(localStorage.getItem('tabs')) || [];

    // SAVE
    function save() {
        localStorage.setItem('tabs', JSON.stringify(tabs));
    }

    // GET CURRENT TAB
    function getCurrentTab(callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            callback(tabs[0]);
        });
    }

    // RENDER
    function renderTabs(filter = '') {
        tabList.innerHTML = '';

        tabs
            .filter(tab => tab.title.toLowerCase().includes(filter.toLowerCase()))
            .forEach((tab, index) => {

                const tabItem = document.createElement('div');
                tabItem.className = 'tab-item';

                tabItem.innerHTML = `
                    <div class="tab-main">
                        <span class="tab-title">${tab.title}</span>
                        <div class="tab-actions">
                            <button class="expand-btn">▶</button>
                            <button class="edit-btn">Edit</button>
                            <button class="delete-btn">Delete</button>
                        </div>
                    </div>
                    <div class="tab-details">
                        ${tab.description || "No description"}
                    </div>
                `;

                // OPEN TAB
                tabItem.querySelector('.tab-title').addEventListener('click', () => {
                    chrome.tabs.create({ url: tab.url });
                });

                // DELETE
                tabItem.querySelector('.delete-btn').addEventListener('click', () => {
                    tabs.splice(index, 1);
                    save();
                    renderTabs();
                });

                // EXPAND
                tabItem.querySelector('.expand-btn').addEventListener('click', function () {
                    const details = tabItem.querySelector('.tab-details');
                    details.classList.toggle('active');
                    this.textContent = details.classList.contains('active') ? '▼' : '▶';
                });

                // EDIT
                tabItem.querySelector('.edit-btn').addEventListener('click', () => {

                    tabItem.innerHTML = `
                        <div class="edit-ui">
                            <input type="text" class="edit-title" value="${tab.title}">
                            <textarea class="edit-desc">${tab.description || ""}</textarea>
                            <div>
                                <button class="save-btn">SAVE</button>
                                <button class="cancel-btn">CANCEL</button>
                            </div>
                        </div>
                    `;

                    const saveBtn = tabItem.querySelector('.save-btn');
                    const cancelBtn = tabItem.querySelector('.cancel-btn');

                    // SAVE
                    saveBtn.addEventListener('click', () => {
                        const newTitle = tabItem.querySelector('.edit-title').value.trim();
                        const newDesc = tabItem.querySelector('.edit-desc').value.trim();

                        tabs[index].title = newTitle || tab.title;
                        tabs[index].description = newDesc;

                        save();
                        renderTabs();
                    });

                    // CANCEL
                    cancelBtn.addEventListener('click', () => {
                        renderTabs(); // restore the original tab UI
                    });
                });

                

                tabList.appendChild(tabItem);
            });
    }

    // ADD TAB
    addBtn.addEventListener('click', () => {
        getCurrentTab((currentTab) => {

            const title = titleInput.value.trim() || currentTab.title;
            const description = descInput.value.trim() || "";

            tabs.push({
                title: title,
                description: description,
                url: currentTab.url
            });

            save();
            renderTabs();

            titleInput.value = "";
            descInput.value = "";
        });
    });

    // SEARCH
    searchInput.addEventListener('input', (e) => {
        renderTabs(e.target.value);
    });

    // INITIAL LOAD
    renderTabs();
});