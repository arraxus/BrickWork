# BrickWork - Internetowe Centrum Kolekcjonera LEGO

BrickWork to lekka, statyczna aplikacja webowa. Umożliwia przeglądanie katalogu zestawów, zarządzanie własną kolekcją i listą życzeń oraz sprawdzenie ofert sprzedaży pożądanych zestawów i przygotowanie tekstu do ogłoszeń sprzedaży. Aplikacja działa całkowicie po stronie klienta (frontend-only). Dane zestawów pochodzą z [Rebrickable API v3](https://rebrickable.com/api/).

- Demo: [Uruchom stronę](https://arraxus.github.io/BrickWork/)
- Język interfejsu: polski
- Technologie: HTML5, CSS3, JavaScript, Rebrickable API, Font Awesome

## Spis treści

- [Funkcje](#funkcje)
- [Wymagania](#wymagania)
- [Konfiguracja API](#konfiguracja-api)
- [Struktura katalogów](#struktura-katalogów)
- [Architektura aplikacji](#architektura-aplikacji)
- [Pamięć i cache](#pamięć-i-cache)
- [Dostępność i responsywność](#dostępność-i-responsywność)
- [Licencja i znaki towarowe](#licencja-i-znaki-towarowe)
- [Autorzy](#autorzy)
- [Podziękowania](#podziękowania)

## Funkcje

- Katalog zestawów
  - Wyszukiwanie po nazwie/numerze
  - Sortowanie (rok, liczba elementów, nazwa)
  - Filtrowanie po serii
  - Paginacja i ładowanie wyników z Rebrickable API

- Strona główna
  - Slider "Najnowsze premiery" (dynamicznie pobierane zestawy z bieżącego roku)
  - Szybkie przejścia do katalogu i kolekcji

- Moja kolekcja
  - Menedżer kolekcji (localStorage)
  - Filtrowanie po serii, sortowanie po dacie dodania
  - Przejście do listy życzeń na giełdzie

- Giełda
  - Lista życzeń (zakładka "Kupię") i linki do wyszukiwania ofert na BrickLink
  - Zakładka "Sprzedam" (generator) do przygotowania prostych ogłoszeń

- Szczegóły zestawu
  - Podgląd wybranego zestawu
  - Dane zestwau: seria, nazwa, numer, rok wydania, ilość elementów, ilość minifigurek

- Kontakt
  - Podstawowe informacje kontaktowe i formularz kontaktowy (przykład działania)

## Wymagania

- Przeglądarka wspierająca `fetch`, `localStorage` i `sessionStorage` (ostatnie wersje Chrome/Firefox/Edge/Safari), w celu ograniczenia zapytan do API
- Klucz do Rebrickable API (bezpłatny, wymaga rejestracji)
  - Dokumentacja: [Rebrickable API v3](https://rebrickable.com/api/)

> [!WARNING]
> Klucz API jest używany po stronie klienta. Nigdy nie udostępniać publicznie.

## Konfiguracja API

Plik: `assets/js/api.js`

- `API_CONFIG.KEY` - Twój klucz Rebrickable API
- `API_CONFIG.BASE_URL` - Bazowy URL API
- Cache odpowiedzi API jest trzymany w `sessionStorage` (funkcja `fetchWithCache`)

Udostępniane funkcje globalnie poprzez `window.BrickAPI`:
- `fetchNewArrivals()` - najnowsze zestawy z bieżącego roku
- `getThemes()` - lista serii
- `searchSets(params, page)` - wyszukiwanie z parametrami i paginacją
- `getSetDetails(setNum)` - szczegóły konkretnego zestawu
- `getSetMinifigs(setNum)` - minifigurki dla zestawu

## Struktura katalogów

```text
.
├─ index.html           # strona główna (hero, nowości, informacje ogólne)
├─ catalog.html         # katalog zestawów z filtrami i sortowaniem
├─ collection.html      # lokalna kolekcja użytkownika
├─ market.html          # giełda: lista życzeń i generator ogłoszeń
├─ contact.html         # kontakt i formularz
├─ set.html             # szczegóły wybranego zestawu
├─ assets/
│  ├─ css/
│  │  └─ main.css       # stylizacja
│  ├─ js/
│  │  ├─ api.js         # integracja z Rebrickable, cache w sessionStorage
│  │  ├─ ui.js          # renderowanie kart, gridów, selectów, slider
│  │  └─ main.js        # logika routingu stron, zdarzenia, localStorage
│  └─ img/
│     ├─ logo.png       # logo aplikacji
│     └─ favicon.ico    # ikona
└─ .github/             # pliki konfiguracyjne GitHub
```

## Architektura aplikacji

- `main.js`
  - Klasa `StorageList` dla list opartych o `localStorage` (kolekcja, wishlist)
  - Globalni menedżerowie:
    - `CollectionManager` - klucz `brickwork_collection`
    - `WishlistManager` - klucz `brickwork_wishlist`
  - `routePage()` - wykrywa aktywną stronę i inicjalizuje odpowiednie moduły:
    - `loadHomePage()` - pobiera i renderuje "Najnowsze premiery"
    - `initCatalog()` - renderuje motywy, pobiera wynik wyszukiwania
    - `initSetPage()` - ładuje szczegóły zestawu
    - `loadUserPage("collection")` - ładuje kolekcję użytkownika
    - `initMarketPage()` - inicjalizacja zakładek giełdy
    - `initContactForm(form)` - obsługa formularza kontaktowego
  - `initGlobalEvents` - obsługa menu typu hamburger na mobile

- `api.js`
  - `fetchWithCache(endpoint, cacheKey)` - warstwa wywołań API z cache w `sessionStorage`
  - Enrichment: doklejanie `theme_name` do obiektów zestawów (domyślnie API podaje tylko numer serii)
  - Funkcje do pobierania motywów, zestawów, minifigurek

- `ui.js`
  - `createSetCard(set, mode)` - karta zestawu (tryb standard/market)
  - `renderGrid(containerId, sets, emptyMsg, mode)` - siatka kart
  - `toggleLoader(containerId, show)` - loader
  - `renderThemeOptions(themes)` - select serii (z uwzględnieniem relacji parent-child)
  - Dodatkowe funkcje (np. slider nowości): `BrickUI.scrollSlider(...)`

- `main.css`
  - Zmienne CSS dla kolorów, promieni, cieni
  - Layout nagłówka, sekcji, przycisków, kart, footer
  - Responsywny, minimalistyczny design

## Pamięć i cache

- `localStorage`
  - `brickwork_collection` - lista numerów zestawów dodanych do kolekcji
  - `brickwork_wishlist` - lista numerów zestawów dodanych do listy życzeń
  - Dane przechowywane wyłącznie na urządzeniu użytkownika

- `sessionStorage`
  - Cache odpowiedzi API (np. motywy, wyniki wyszukiwania)
  - Wygasa wraz z sesją przeglądarki
  - W razie problemów: wyczyść pamięć przeglądarki (F12 - Dane)

## Dostępność i responsywność

- Nawigacja mobilna (hamburger), przyciski o wysokim kontraście
- Ikony [Font Awesome](https://fontawesome.com/)
- Stosowane elementy HTML5 i atrybuty ARIA (np. przycisk hamburgera)

## Licencja i znaki towarowe

- LEGO® jest znakiem towarowym Grupy LEGO (zawartość aplikacji nie jest powiązana z LEGO Group).
- Dane pochodzą z [Rebrickable API v3](https://rebrickable.com/api/). Sprawdź warunki korzystania z API.

## Autorzy

- Tomasz Hanusek
- Damian Spodar

## Podziękowania

- [Rebrickable](https://rebrickable.com/api/) – źródło danych zestawów
- [Font Awesome](https://fontawesome.com/) – zestaw ikon

©2026 BrickWork. Wszelkie prawa zastrzeżone.
