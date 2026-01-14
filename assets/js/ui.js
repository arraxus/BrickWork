// Elementy UI
// Uniwersalna funkcja tworząca kartę zestawu
function createSetCard(set, mode = "standard") {
    const img = set.set_img_url
    const category = set.theme_name || "LEGO";

    let actionsHTML;

    if (mode === "market") {
        const blUrl = `https://www.bricklink.com/v2/search.page?q=${set.set_num}`;
        actionsHTML = `
            <a href="${blUrl}" target="_blank" class="btn" style="background-color:#7bb6e0;">Kup na BrickLink</a>
            <a href="set.html?id=${set.set_num}" class="btn">Szczegóły</a>
        `;
    } else {
        actionsHTML = `<a href="set.html?id=${set.set_num}" class="btn">Szczegóły</a>`;
    }

    return `
        <article class="set-card">
            <div class="card-image">
                <img src="${img}" alt="${set.name}" loading="lazy">
            </div>
            <div class="card-details">
                <span class="set-category">${category}</span>
                <h3>${set.name}</h3>
                <span class="set-year">Rok: ${set.year}</span>
                <div class="set-meta">
                    <span class="set-number">Nr: ${set.set_num}</span>
                    <span class="set-pieces">${set.num_parts} el.</span>
                </div>
                <div class="set-card-actions">${actionsHTML}</div>
            </div>
        </article>
    `;
}

// Renderowanie elementów
// Renderowanie siatki zestawów
function renderGrid(containerId, sets, emptyMsg = "Brak danych.", mode = "standard") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!sets || sets.length === 0) {
        container.innerHTML = `<p class="placeholder-msg">${emptyMsg}</p>`;
        return;
    }

    container.innerHTML = sets.map(set => createSetCard(set, mode)).join('');
}

// Przełączanie loadera
function toggleLoader(containerId, show) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = show ? '<div class="loader">Ładowanie...</div>' : '';
    }
}

// Renderowanie opcji wyboru serii
function renderThemeOptions(themes) {
    const select = document.getElementById("theme-select");
    if (!select) return;

    const themeMap = new Map();
    themes.forEach(t => themeMap.set(t.id, t.name));

    const processedThemes = themes.map(theme => {
        let displayName = theme.name;

        if (theme.parent_id) {
            const parentName = themeMap.get(theme.parent_id);
            if (parentName) {
                displayName = `${theme.name} (${parentName})`;
            }
        }
        return {
            id: theme.id,
            name: displayName
        };
    });
    processedThemes.sort((a, b) => a.name.localeCompare(b.name));

    const options = processedThemes.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    select.innerHTML = `<option value="">Wszystkie serie</option>${options}`;
}

// Wypełnia select tylko seriami, które występują w danych
function populateThemeFilter(dataSet, selectId) {
    const select = document.getElementById(selectId);
    if (!select || !dataSet) return;

    const uniqueThemes = [...new Set(dataSet.map(d => d.theme_name))].sort();

    select.innerHTML = '<option value="all">Wszystkie serie</option>' +
        uniqueThemes.map(name => `<option value="${name}">${name}</option>`).join('');
}

// Renderowanie strony szczegółów zestawu
function renderSetDetails(set) {
    const main = document.querySelector("main");
    if (!main) return;

    if (!set) {
        main.innerHTML = '<p class="error">Nie udało się pobrać danych.</p>';
        return;
    }

    main.innerHTML = `
        <div class="set-details-container">
            <div class="details-image"><img src="${set.set_img_url}" alt="${set.name}"></div>
            <div class="details-info">
                <span class="set-category-badge">${set.theme_name}</span>
                <h1>${set.name}</h1>
                <div class="details-meta-grid">
                    <div class="meta-item"><strong>Numer:</strong> ${set.set_num}</div>
                    <div class="meta-item"><strong>Rok:</strong> ${set.year}</div>
                    <div class="meta-item"><strong>Elementy:</strong> ${set.num_parts}</div>
                    <div class="meta-item"><strong>Minifigurki:</strong><span id="minifig-count">0</span></div>
                </div>
                
                <div class="details-actions">
                    <div class="primary-actions">
                        <button id="add-to-collection-btn" class="btn btn-lg" data-set-num="${set.set_num}">
                            Dodaj do kolekcji
                        </button>
                        <button id="add-to-wishlist-btn" class="btn-outline" data-set-num="${set.set_num}">
                            Dodaj do listy życzeń
                        </button>
                    </div>

                    <a href="${set.set_url}" target="_blank" class="rebrickable-link">
                        Znajdź więcej informacji na Rebrickable
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Zmiana stylu przycisków
// Przyciski kolekcji
function updateCollectionButton(btn, isOwned) {
    if (isOwned) {
        btn.textContent = "Usuń z kolekcji";
        btn.classList.add("btn-owned");
        btn.style.backgroundColor = "#4caf50";
    } else {
        btn.textContent = "Dodaj do kolekcji";
        btn.classList.remove("btn-owned");
        btn.style.backgroundColor = "";
    }
}
// Przyciski listy życzeń
function updateWishlistButton(btn, isActive) {
    if (isActive) {
        btn.textContent = "Na liście życzeń";
        // Zmieniamy styl na "pełny" (jak w kolekcji)
        btn.classList.remove("btn-outline");
        btn.classList.add("btn");
        btn.classList.add("btn-wishlist-active");
    } else {
        btn.textContent = "Dodaj do listy życzeń";
        // Wracamy do stylu "outline"
        btn.classList.add("btn-outline");
        btn.classList.remove("btn");
        btn.classList.remove("btn-wishlist-active");
    }
}

// Obsługa slidera
function scrollSlider(direction) {
    const container = document.getElementById("new-arrivals-container");
    const scrollAmount = 300;

    if(container) {
        container.scrollBy({
            left: direction * scrollAmount,
            behavior: "smooth"
        });
    }
}

window.BrickUI = { renderGrid, toggleLoader, renderThemeOptions, populateThemeFilter,
    renderSetDetails, updateCollectionButton, updateWishlistButton, scrollSlider
};