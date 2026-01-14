// Konfiguracja API
const API_CONFIG = {
    KEY: 'REBRICKABLE_KEY_PLACEHOLDER',
    BASE_URL: 'https://rebrickable.com/api/v3/lego'
};

// Funkcje pomocnicze
// Główna funkcja obsługująca zapytania i cache
async function fetchWithCache(endpoint, cacheKey) {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        try {
            console.log(`[API] Cache fetching: ${cacheKey}`);
            return JSON.parse(cached);
        } catch (e) {
            sessionStorage.removeItem(cacheKey);
        }
    }

    try {
        console.log(`[API] API fetching: ${endpoint}`);
        const res = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
            headers: { 'Authorization': `key ${API_CONFIG.KEY}`, 'Accept': 'application/json' }
        });

        if (!res.ok) {console.error(`HTTP Error ${res.status}` ); return null;}

        const data = await res.json();

        sessionStorage.setItem(cacheKey, JSON.stringify(data));
        return data;
    } catch (error) {
        console.error(`[API] Error: ${endpoint}:`, error);
        return null;
    }
}
// Pobieranie nazwy serii
async function getThemeName(themeId) {
    const themes = await getThemes();
    const theme = themes.find(t => t.id === themeId);
    return theme ? theme.name : "Inne";
}
// Doklejanie nazw serii do listy zestawów
async function enrichWithThemes(sets) {
    if (!sets) return [];
    return Promise.all(sets.map(async (set) => ({
        ...set,
        theme_name: await getThemeName(set.theme_id)
    })));
}

// Funkcje API
// Pobieranie listy serii
async function getThemes() {
    const data = await fetchWithCache("/themes/?page_size=1000", "themes");
    return data ? data.results : [];
}
// Pobieranie najnowszych zestawów
async function fetchNewArrivals() {
    const year = new Date().getFullYear();
    const endpoint = `/sets/?min_year=${year}&max_year=${year}&page_size=8&ordering=-year`;

    const data = await fetchWithCache(endpoint, `new_arrivals_${year}`);
    if (!data || !data.results) return [];

    return await enrichWithThemes(data.results);
}
// Wyszukiwanie zestawów z filtrami
async function searchSets(params, page=1) {
    const urlParams = new URLSearchParams({
        page: page,
        page_size: 20,
        ...params
    });

    const endpoint = `/sets/?${urlParams.toString()}`;
    const data = await fetchWithCache(endpoint, `search_${urlParams.toString()}`);

    if (data && data.results) {
        data.results = await enrichWithThemes(data.results);
    }
    return data || { results: [], count: 0, next: null, previous: null };
}

// Pobieranie szczegółów konkretnego zestawu na podstawie jego numeru
async function getSetDetails(setNum) {
    const data = await fetchWithCache(`/sets/${setNum}/`, `set_details_${setNum}`);
    if (data) {
        data.theme_name = await getThemeName(data.theme_id);
    }
    return data;
}

// Pobieranie listy minifigurek dla danego zestawu
async function getSetMinifigs(setNum) {
    const data = await fetchWithCache(`/sets/${setNum}/minifigs/`, `minifigs_${setNum}`);
    return data ? data.results : [];
}

window.BrickAPI = { fetchNewArrivals,  getThemes,  searchSets,  getSetDetails,  getSetMinifigs };