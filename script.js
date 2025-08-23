const API_KEY = "ab69dd0914ac5043d1afcd1ee933c354";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentPage = 1;
let currentQuery = "";
let currentGenre = "";
let currentYear = "";
let currentSort = "popularity.desc";
let currentLang = ""; // NEW: language filter
let loading = false;

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let watched = JSON.parse(localStorage.getItem("watched")) || [];

// ===== Elements =====
const searchBtn = document.getElementById("search-btn");
const searchInput = document.getElementById("search-input");
const moviesDiv = document.getElementById("movies");

const modal = document.getElementById("modal");
const modalDetails = document.getElementById("modalDetails");
const closeModal = document.getElementById("closeModal");

const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const pageInfo = document.getElementById("pageInfo");

const themeToggle = document.getElementById("theme-toggle");

const genreFilter = document.getElementById("genre-filter");
const yearFilter = document.getElementById("year-filter");
const sortFilter = document.getElementById("sort-filter");
const languageFilter = document.getElementById("language-filter");

const loadingDiv = document.getElementById("loading");

// Favorites & Watched
const favBtn = document.getElementById("favorites-btn");
const favModal = document.getElementById("favorites-modal");
const closeFav = document.getElementById("closeFavorites");
const favList = document.getElementById("favorites-list");
const clearFavBtn = document.getElementById("clear-favorites");

const watchedBtn = document.getElementById("watched-btn");
const watchedModal = document.getElementById("watched-modal");
const closeWatched = document.getElementById("closeWatched");
const watchedList = document.getElementById("watched-list");
const clearWatchedBtn = document.getElementById("clear-watched");

// ===== Theme =====
if (localStorage.getItem("theme") === "light") document.body.classList.add("light");
setThemeIcon();

// ===== Populate Language Filter =====
const languages = [
  { code: "", name: "All Languages" },
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" }
];

languages.forEach(lang => {
  const opt = document.createElement("option");
  opt.value = lang.code;
  opt.textContent = lang.name;
  languageFilter.appendChild(opt);
});

// ===== Fetch Movies =====
async function fetchMovies() {
  if (loading) return;
  loading = true;
  loadingDiv.classList.remove("hidden");

  let url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&page=${currentPage}&sort_by=${currentSort}`;
  if (currentQuery) url = `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(currentQuery)}&page=${currentPage}`;
  if (currentGenre) url += `&with_genres=${currentGenre}`;
  if (currentYear) url += `&primary_release_year=${currentYear}`;
  if (currentLang) url += `&with_original_language=${currentLang}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const movies = (data.results || []).filter(m => !m.adult && m.media_type !== "person");

    moviesDiv.innerHTML = "";
    if (movies.length === 0) {
      moviesDiv.innerHTML = `<div class="empty"><img src="https://cdn-icons-png.flaticon.com/512/4076/4076549.png" /><p>No results found 😔</p></div>`;
      pageInfo.textContent = `Page ${currentPage}`;
      return;
    }

    displayMovies(movies);
    pageInfo.textContent = `Page ${currentPage}`;
  } catch {
    moviesDiv.innerHTML = `<div class="empty"><img src="https://cdn-icons-png.flaticon.com/512/3917/3917375.png" /><p>Error fetching movies</p></div>`;
  } finally {
    loading = false;
    loadingDiv.classList.add("hidden");
  }
}

// ===== Display Movies =====
function displayMovies(movies) {
  moviesDiv.innerHTML = "";

  movies.forEach(m => {
    const type = m.media_type === "tv" ? "Series" : "Movie";
    const poster = m.poster_path ? IMG_URL + m.poster_path : "https://via.placeholder.com/180x250";
    const rating = m.vote_average ? m.vote_average.toFixed(1) : "—";

    const div = document.createElement("div");
    div.classList.add("movie");

    const isFav = favorites.some(f => f.id === m.id);
    const isWatched = watched.some(w => w.id === m.id);

    div.innerHTML = `
      <img src="${poster}" alt="${m.title || m.name}">
      <button class="fav-btn corner" title="Toggle favorite"><i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i></button>
      <button class="watched-btn corner" title="Toggle watched"><i class="${isWatched ? 'fa-solid' : 'fa-regular'} fa-eye"></i></button>
      <h3>${m.title || m.name}</h3>
      <span>${type}</span>
      <div class="rating-inline">⭐ ${rating}</div>
    `;

    // Open details modal
    div.querySelector("img").addEventListener("click", () => showDetails(m.id, type));

    // Toggle favorite
    div.querySelector(".fav-btn").addEventListener("click", e => {
      e.stopPropagation();
      toggleFavorite(m);
      renderFavorites();
      const icon = div.querySelector(".fav-btn i");
      icon.classList.toggle("fa-solid");
      icon.classList.toggle("fa-regular");
    });

    // Toggle watched
    div.querySelector(".watched-btn").addEventListener("click", e => {
      e.stopPropagation();
      toggleWatched(m);
      renderWatched();
      const icon = div.querySelector(".watched-btn i");
      icon.classList.toggle("fa-solid");
      icon.classList.toggle("fa-regular");
    });

    moviesDiv.appendChild(div);
  });
}

// ===== Toggle Favorite =====
function toggleFavorite(movie) {
  const exists = favorites.find(f => f.id === movie.id);
  if (exists) favorites = favorites.filter(f => f.id !== movie.id);
  else favorites.push(movie);
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

// ===== Toggle Watched =====
function toggleWatched(movie) {
  const exists = watched.find(w => w.id === movie.id);
  if (exists) watched = watched.filter(w => w.id !== movie.id);
  else watched.push(movie);
  localStorage.setItem("watched", JSON.stringify(watched));
}

// ===== Render Favorites =====
function renderFavorites() {
  favList.innerHTML = "";
  if (favorites.length === 0) {
    favList.innerHTML = `<div class="empty"><img src="https://cdn-icons-png.flaticon.com/512/6598/6598519.png" /><p>No favorites yet ❤️</p></div>`;
    return;
  }
  favorites.forEach(m => {
    const div = document.createElement("div");
    const poster = m.poster_path ? IMG_URL + m.poster_path : "https://via.placeholder.com/180x250";
    div.classList.add("fav-item");
    div.innerHTML = `<img src="${poster}" alt="${m.title || m.name}"><span>${m.title || m.name}</span>`;
    favList.appendChild(div);
  });
}

// ===== Render Watched =====
function renderWatched() {
  watchedList.innerHTML = "";
  if (watched.length === 0) {
    watchedList.innerHTML = `<div class="empty"><img src="https://cdn-icons-png.flaticon.com/512/1077/1077035.png" /><p>No watched movies yet 👁️</p></div>`;
    return;
  }
  watched.forEach(m => {
    const div = document.createElement("div");
    const poster = m.poster_path ? IMG_URL + m.poster_path : "https://via.placeholder.com/180x250";
    div.classList.add("fav-item");
    div.innerHTML = `<img src="${poster}" alt="${m.title || m.name}"><span>${m.title || m.name}</span>`;
    watchedList.appendChild(div);
  });
}

// ===== Details Modal =====
async function showDetails(id, type) {
  const url = `https://api.themoviedb.org/3/${type === "Series" ? "tv" : "movie"}/${id}?api_key=${API_KEY}&language=en-US`;
  try {
    const res = await fetch(url);
    const m = await res.json();
    const poster = m.poster_path ? IMG_URL + m.poster_path : "https://via.placeholder.com/180x250";
    modalDetails.innerHTML = `
      <div class="modal-movie">
        <img src="${poster}" alt="${m.title || m.name}">
        <div class="modal-info">
          <h2>${m.title || m.name}</h2>
          <p><strong>Release:</strong> ${(m.release_date || m.first_air_date || "N/A")}</p>
          <p><strong>Rating:</strong> ⭐ ${m.vote_average || "—"}</p>
          <p>${m.overview || "No description available."}</p>
        </div>
      </div>
    `;
    modal.classList.add("open");
  } catch {
    alert("Error fetching movie details.");
  }
}

// ===== Theme =====
function setThemeIcon() {
  themeToggle.innerHTML = document.body.classList.contains("light")
    ? '<i class="fa-solid fa-moon"></i>'
    : '<i class="fa-solid fa-sun"></i>';
}

// ===== Event Listeners =====
searchBtn.addEventListener("click", () => { currentQuery = searchInput.value.trim(); currentPage = 1; fetchMovies(); });
nextBtn.addEventListener("click", () => { currentPage++; fetchMovies(); });
prevBtn.addEventListener("click", () => { if(currentPage>1) currentPage--; fetchMovies(); });

closeModal.addEventListener("click", () => modal.classList.remove("open"));
closeFav.addEventListener("click", () => favModal.classList.remove("open"));
closeWatched.addEventListener("click", () => watchedModal.classList.remove("open"));

favBtn.addEventListener("click", () => { renderFavorites(); favModal.classList.add("open"); });
watchedBtn.addEventListener("click", () => { renderWatched(); watchedModal.classList.add("open"); });

clearFavBtn.addEventListener("click", () => { favorites=[]; localStorage.setItem("favorites", JSON.stringify(favorites)); renderFavorites(); fetchMovies(); });
clearWatchedBtn.addEventListener("click", () => { watched=[]; localStorage.setItem("watched", JSON.stringify(watched)); renderWatched(); fetchMovies(); });

genreFilter.addEventListener("change", () => { currentGenre = genreFilter.value; currentPage = 1; fetchMovies(); });
yearFilter.addEventListener("change", () => { currentYear = yearFilter.value; currentPage = 1; fetchMovies(); });
sortFilter.addEventListener("change", () => { currentSort = sortFilter.value; currentPage = 1; fetchMovies(); });
languageFilter.addEventListener("change", () => { currentLang = languageFilter.value; currentPage = 1; fetchMovies(); });

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
  setThemeIcon();
});

// ===== Initial Fetch =====
fetchMovies();
