// Zarządzanie localstorage dla kolekcji i listy życzeń
class StorageList {
    constructor(storageKey) {
        this.key = storageKey;
    }

    getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.key) || "[]");
        } catch (e) {
            console.error("Błąd odczytu localStorage", e);
            return [];
        }
    }
    has(id) {
        return this.getAll().includes(id);
    }
    toggle(id) {
        let list = this.getAll();
        const exists = list.includes(id);

        if (exists) {
            list = list.filter(item => item !== id);
        } else {
            list.push(id);
        }

        localStorage.setItem(this.key, JSON.stringify(list));
        return !exists;
    }
    remove(id) {
        if (this.has(id)) this.toggle(id);
    }
}

// Zmienne globalne dla menedżerów kolekcji i listy życzeń
const CollectionManager = new StorageList("brickwork_collection");
const WishlistManager = new StorageList("brickwork_wishlist");

// Cache danych w pamięci
const APP_STATE = {
    collection: [],
    wishlist: [],
    currentCatalogPage: 1
};

// Inicjalizacja aplikacji
document.addEventListener("DOMContentLoaded", () => {
    initGlobalEvents();
    routePage();
});

// Globalne zdarzenia
function initGlobalEvents() {
    // Menu mobilne (Hamburger)
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('.main-nav');
    if (hamburger && nav) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            nav.classList.toggle("active");
            const expanded = hamburger.classList.contains("active");
            hamburger.setAttribute("aria-expanded", expanded);
        });

        nav.addEventListener("click", (e) => {
            if (e.target.matches("a")) {
                hamburger.classList.remove("active");
                nav.classList.remove("active");
            }
        });
    }
}

// Wykrywanie otwartej strony i inicjalizacja funkcji
function routePage() {
    const path = window.location.pathname;

    if (document.getElementById("new-arrivals-container")) loadHomePage();
    if (document.getElementById("catalog-grid")) initCatalog();
    if (path.includes("set.html") || new URLSearchParams(window.location.search).has("id")) initSetPage();
    if (document.querySelector('body.collection-page')) loadUserPage("collection");
    if (document.querySelector('body.market-page')) initMarketPage();

    const contactForm = document.getElementById("contact-form");
    if (contactForm) initContactForm(contactForm);
}

// Załadowanie strony głównej
async function loadHomePage() {
    window.BrickUI.toggleLoader("new-arrivals-container", true);
    const sets = await window.BrickAPI.fetchNewArrivals();
    window.BrickUI.renderGrid("new-arrivals-container", sets, "Brak nowości.");
}

// Załadowanie i obsługa strony katalogu
async function initCatalog() {
    const themes = await window.BrickAPI.getThemes();
    window.BrickUI.renderThemeOptions(themes);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("theme")) document.getElementById("theme-select").value = urlParams.get("theme");
    if (urlParams.has("q")) document.getElementById("search-query").value = urlParams.get("q");
    if (urlParams.has("year")) {
        document.getElementById("min-year").value = urlParams.get("year");
        document.getElementById("max-year").value = urlParams.get("year");
    }

    document.getElementById("filter-form").addEventListener("submit", (e) => {
        e.preventDefault();
        performSearch(1);
    });

    document.getElementById("reset-filters").addEventListener("click", () => {
        document.getElementById("filter-form").reset();
        performSearch(1);
    });

    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener("click", () => {
            if (APP_STATE.currentCatalogPage > 1) performSearch(APP_STATE.currentCatalogPage - 1);
        });
        nextBtn.addEventListener("click", () => {
            performSearch(APP_STATE.currentCatalogPage + 1);
        });
    }

    await performSearch(1);
}

// Wykonanie wyszukiwania z aktualnymi filtrami
async function performSearch(page = 1) {
    APP_STATE.currentCatalogPage = page;
    window.BrickUI.toggleLoader("catalog-grid", true);

    const getVal = (id) => document.getElementById(id)?.value || '';

    let minYear = getVal("min-year");
    let maxYear = getVal("max-year");

    const params = {
        search: getVal("search-query"),
        theme_id: getVal("theme-select"),
        min_year: minYear,
        max_year: maxYear,
        min_parts: getVal("min-parts"),
        max_parts: getVal("max-parts"),
        ordering: document.getElementById("sort-select")?.value || "-year"
    };

    const data = await window.BrickAPI.searchSets(params, page);

    window.BrickUI.renderGrid("catalog-grid", data.results, "Nie znaleziono zestawów spełniających kryteria.");

    const countBadge = document.getElementById("results-count");
    if (countBadge) {
        const total = data.count || 0;
        countBadge.textContent = `Liczba wyników: ${total}`;
    }

    updatePaginationUI(data, page);
}

// Aktualizacja UI paginacji
function updatePaginationUI(data, currentPage) {
    const container = document.getElementById("pagination-controls");
    const info = document.getElementById("page-info");
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    if (!container) return;

    if (!data.results || data.results.length === 0) {
        container.style.display = "none";
        return;
    }

    container.style.display = "flex";
    if(info) info.textContent = `Strona ${currentPage}`;

    if(prevBtn) prevBtn.disabled = !data.previous;
    if(nextBtn) nextBtn.disabled = !data.next;
}

// Załadowanie strony szczegółów zestawu
async function initSetPage() {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
        document.querySelector('main').innerHTML = '<p class="error">Brak numeru zestawu.</p>';
        return;
    }

    document.querySelector('main').innerHTML = '<div class="loader">Ładowanie szczegółów...</div>';

    const set = await window.BrickAPI.getSetDetails(id);

    const isOwned = CollectionManager.has(set.set_num);
    const inWishlist = WishlistManager.has(set.set_num);

    window.BrickUI.renderSetDetails(set);

    const minifigs = await window.BrickAPI.getSetMinifigs(id);
    const minifigCountEl = document.getElementById("minifig-count");
    if (minifigCountEl) minifigCountEl.textContent = minifigs.length;

    setupSetActionButtons(set.set_num, isOwned, inWishlist);
}

// Ustawienie logiki przycisków dodawania do kolekcji i wishlisty
function setupSetActionButtons(setNum, initialOwned, initialWishlist) {
    const collBtn = document.getElementById("add-to-collection-btn");
    const wishBtn = document.getElementById("add-to-wishlist-btn");

    if (collBtn) window.BrickUI.updateCollectionButton(collBtn, initialOwned);
    if (wishBtn) window.BrickUI.updateWishlistButton(wishBtn, initialWishlist);

    if (collBtn) {
        collBtn.addEventListener("click", () => {
            const isNowOwned = CollectionManager.toggle(setNum);
            window.BrickUI.updateCollectionButton(collBtn, isNowOwned);

            if (isNowOwned && WishlistManager.has(setNum)) {
                WishlistManager.remove(setNum);
                if (wishBtn) window.BrickUI.updateWishlistButton(wishBtn, false);
            }
        });
    }

    if (wishBtn) {
        wishBtn.addEventListener("click", () => {
            const isNowInWishlist = WishlistManager.toggle(setNum);
            window.BrickUI.updateWishlistButton(wishBtn, isNowInWishlist);

            if (isNowInWishlist && CollectionManager.has(setNum)) {
                CollectionManager.remove(setNum);
                if (collBtn) window.BrickUI.updateCollectionButton(collBtn, false);
            }
        });
    }
}

// Załadowanie strony kolekcji lub listy życzeń
async function loadUserPage(type) {
    const containerId = type === "collection" ? "collection-grid" : "wishlist-grid";
    const manager = type === "collection" ? CollectionManager : WishlistManager;

    window.BrickUI.toggleLoader(containerId, true);

    const ids = manager.getAll();
    if (ids.length === 0) {
        document.getElementById(containerId).innerHTML = `
            <div class="empty-state">
                <p>Lista jest pusta.</p>
                <a href="catalog.html" class="btn">Przejdź do katalogu</a>
            </div>`;
        return;
    }

    const sets = await Promise.all(ids.map(id => window.BrickAPI.getSetDetails(id)));
    APP_STATE[type] = sets
        .map((set, index) => set ? { ...set, addedIndex: index } : null)
        .filter(set => set !== null);

    window.BrickUI.populateThemeFilter(APP_STATE[type], `${type}-theme-filter`);

    applyUserFilters(type);

    const sortEl = document.getElementById(`${type}-sort`);
    const themeEl = document.getElementById(`${type}-theme-filter`);

    if (sortEl) sortEl.onchange = () => applyUserFilters(type);
    if (themeEl) themeEl.onchange = () => applyUserFilters(type);
}

// Zastosowanie filtrów i sortowania na stronie kolekcji/listy życzeń
function applyUserFilters(type) {
    const themeVal = document.getElementById(`${type}-theme-filter`)?.value || "all";
    const sortVal = document.getElementById(`${type}-sort`)?.value;

    let results = APP_STATE[type].filter(s => themeVal === "all" || s.theme_name === themeVal);

    if (sortVal) {
        results.sort((a, b) => {
            if (sortVal === "added-desc") return b.addedIndex - a.addedIndex;
            if (sortVal === "added-asc") return a.addedIndex - b.addedIndex;
            if (sortVal.includes("year")) {
                return sortVal === "year-desc" ? b.year - a.year : a.year - b.year;
            }
            if (sortVal.includes("parts")) {
                return sortVal === "parts-desc" ? b.num_parts - a.num_parts : a.num_parts - b.num_parts;
            }
            return 0;
        });
    }

    const cardMode = type === "wishlist" ? "market" : "standard";

    window.BrickUI.renderGrid(
        type === 'collection' ? 'collection-grid' : 'wishlist-grid',
        results,
        'Brak wyników filtrowania.',
        cardMode
    );

    const countEl = document.getElementById(`${type}-count`);
    if(countEl) countEl.textContent = `Liczba zestawów: ${results.length}`;
}

// Inicjalizacja strony listy życzeń i sekcji sprzedam
async function initMarketPage() {
    const tabs = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            contents.forEach(c => c.style.display = "none");

            tab.classList.add("active");
            const targetId = tab.dataset.tab;
            document.getElementById(targetId).style.display = "block";
        });
    });

    await loadUserPage("wishlist");

    await loadSellSection();
}

// Załadowanie sekcji "Sprzedam zestaw"
async function loadSellSection() {
    const listContainer = document.getElementById("sellable-list");
    if (!listContainer) return;

    const collectionIds = CollectionManager.getAll();

    if (collectionIds.length === 0) {
        listContainer.innerHTML = '<p class="error-msg">Twoja kolekcja jest pusta. Dodaj zestawy, aby móc je sprzedać.</p>';
        return;
    }

    listContainer.innerHTML = '<div class="loader">Ładowanie kolekcji...</div>';

    const promises = collectionIds.map(id => window.BrickAPI.getSetDetails(id));
    const setsRaw = await Promise.all(promises);
    const sets = setsRaw.filter(s => s !== null);

    renderSellableList(sets, listContainer);

    const searchInput = document.getElementById("sell-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = sets.filter(s =>
                s.name.toLowerCase().includes(query) ||
                s.set_num.toLowerCase().includes(query)
            );
            renderSellableList(filtered, listContainer);
        });
    }

    initGeneratorLogic();
}

// Lokalna funkcja renderująca listę w panelu bocznym generatora
function renderSellableList(sets, container) {
    if (sets.length === 0) {
        container.innerHTML = '<p>Brak wyników.</p>';
        return;
    }

    container.innerHTML = sets.map(set => `
        <div class="sellable-item" 
             data-name="${set.name}" 
             data-num="${set.set_num}" 
             data-img="${set.set_img_url || "assets/img/placeholder.png"}">
            <img src="${set.set_img_url || "assets/img/placeholder.png"}" alt="img" loading="lazy">
            <div class="sellable-info">
                <h4>${set.name}</h4>
                <small>${set.set_num}</small>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.sellable-item').forEach(item => {
        item.addEventListener("click", function() {

            container.querySelectorAll('.sellable-item').forEach(i => i.classList.remove("selected"));
            this.classList.add("selected");

            document.getElementById("selected-set-display").style.display = "flex";
            document.getElementById("no-set-selected-msg").style.display = "none";
            document.getElementById("gen-title").textContent = this.dataset.name;
            document.getElementById("gen-num").textContent = this.dataset.num;
            document.getElementById("gen-img").src = this.dataset.img;
            document.getElementById("generate-btn").disabled = false;
        });
    });
}

// Inicjalizacja logiki generatora opisu sprzedaży
function initGeneratorLogic() {
    const genBtn = document.getElementById("generate-btn");
    const copyBtn = document.getElementById("copy-btn");

    if (genBtn) {
        genBtn.addEventListener("click", () => {
            const setName = document.getElementById("gen-title").textContent;
            const setNum = document.getElementById("gen-num").textContent;

            const bricks = document.getElementById("cond-bricks").value;
            const box = document.getElementById("cond-box").value;
            const instr = document.getElementById("cond-instr").value;
            const comp = document.getElementById("cond-comp").value;
            const desc = document.getElementById("custom-desc").value;

            const text = `Sprzedam zestaw LEGO ${setNum} - ${setName}

STAN ZESTAWU:
- Klocki: ${bricks}
- Kompletność: ${comp}
- Instrukcja: ${instr}
- Pudełko: ${box}

OPIS:
${desc ? desc : "Zestaw pochodzi z prywatnej kolekcji."}

Zapraszam do kontaktu i zakupu!`;

            const outputArea = document.getElementById("output-area");
            const finalText = document.getElementById("final-text");

            outputArea.style.display = "block";
            finalText.value = text;

            outputArea.scrollIntoView({ behavior: "smooth" });
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            const textArea = document.getElementById("final-text");
            textArea.select();
            navigator.clipboard.writeText(textArea.value).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = "Skopiowano!";
                setTimeout(() => copyBtn.textContent = originalText, 2000);
            });
        });
    }
}

// Inicjalizacja formularza kontaktowego
function initContactForm(form) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const successMsg = document.getElementById("form-success");
        form.style.display = "none";
        successMsg.style.display = "block";
        form.reset();
    });

    const resetBtn = document.getElementById("send-another-btn");
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.getElementById('form-success').style.display = 'none';
            form.style.display = 'block';
        });
    }
}