const API_KEY = "ab69dd0914ac5043d1afcd1ee933c354";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentPage = 1;
let currentQuery = "";
let currentGenre = "";
let currentYear = "";
let currentSort = "popularity.desc";
let currentLang = "";
let currentMood = "";
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
const moodFilter = document.getElementById("mood-filter");

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

// ===== Populate Languages Dynamically =====
async function populateLanguages() {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/configuration/languages?api_key=${API_KEY}`);
    const data = await res.json();
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "All Languages";
    languageFilter.appendChild(defaultOpt);

    data.forEach(lang => {
      const opt = document.createElement("option");
      opt.value = lang.iso_639_1;
      opt.textContent = lang.english_name || lang.iso_639_1;
      languageFilter.appendChild(opt);
    });
  } catch (err) {
    console.error("Error fetching languages:", err);
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "All Languages";
    languageFilter.appendChild(opt);
  }
}
populateLanguages();
const languageSearchInput = document.getElementById("language-search");

languageSearchInput.addEventListener("input", () => {
  const searchValue = languageSearchInput.value.toLowerCase();
  Array.from(languageFilter.options).forEach(option => {
    const text = option.text.toLowerCase();
    option.style.display = text.includes(searchValue) ? "" : "none";
  });
});

// ===== Populate Year Filter Dynamically =====
const currentYearValue = new Date().getFullYear();
for (let y = currentYearValue + 5; y >= 1980; y--) {
  const opt = document.createElement("option");
  opt.value = y;
  opt.textContent = y;
  yearFilter.appendChild(opt);
}

// ===== Populate Mood Filter =====
const moods = [
  { code: "", name: "All Moods" },
  { code: "happy", name: "Happy" },
  { code: "sad", name: "Sad" },
  { code: "romantic", name: "Romantic" },
  { code: "thrilling", name: "Thrilling" },
  { code: "scary", name: "Scary" },
  { code: "funny", name: "Funny" }
];

moodFilter.innerHTML = "";
moods.forEach(m => {
  const opt = document.createElement("option");
  opt.value = m.code;
  opt.textContent = m.name;
  moodFilter.appendChild(opt);
});

// ===== Mood Map =====
const moodMap = {
  happy: [35, 10751],
  sad: [18],
  romantic: [10749],
  thrilling: [53, 9648],
  scary: [27],
  funny: [35]
};

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
  if (currentMood) {
    const genresForMood = moodMap[currentMood];
    if (genresForMood && genresForMood.length > 0) {
      url += `&with_genres=${genresForMood.join(",")}`;
    }
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    const movies = (data.results || []).filter(m => !m.adult && m.media_type !== "person");

    moviesDiv.innerHTML = "";
    if (movies.length === 0) {
      moviesDiv.innerHTML = `<div class="empty"><img src="https://cdn-icons-png.flaticon.com/512/4076/4076549.png" alt="No results"/><p>No results found 😔</p></div>`;
      pageInfo.textContent = `Page ${currentPage}`;
      return;
    }

    displayMovies(movies);
    pageInfo.textContent = `Page ${currentPage}`;
  } catch {
    moviesDiv.innerHTML = `<div class="empty"><img src="https://cdn-icons-png.flaticon.com/512/3917/3917375.png" alt="Error"/><p>Error fetching movies</p></div>`;
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

    div.querySelector("img").addEventListener("click", () => showDetails(m.id, type));

    div.querySelector(".fav-btn").addEventListener("click", e => {
      e.stopPropagation();
      toggleFavorite(m);
      renderFavorites();
      const icon = div.querySelector(".fav-btn i");
      icon.classList.toggle("fa-solid");
      icon.classList.toggle("fa-regular");
    });

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
    favList.innerHTML = `<div class="empty"><img src="https://cdn-icons-png.flaticon.com/512/6598/6598519.png" alt="Empty favorites"/><p>No favorites yet ❤️</p></div>`;
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
    watchedList.innerHTML = `<div class="empty"><img src="https://cdn-icons-png.flaticon.com/512/1077/1077035.png" alt="Empty watched"/><p>No watched movies yet 👁️</p></div>`;
    return;
  }
  watched.forEach(m => {
    const div = document.createElement("div");
    const poster = m.poster_path ? IMG_URL + m.poster_path : "https://via.placeholder.com/180x250";
    div.classList.add("watched-item"); // ✅ FIXED
    div.innerHTML = `<img src="${poster}" alt="${m.title || m.name}"><span>${m.title || m.name}</span>`;
    watchedList.appendChild(div);
  });
}

async function showDetails(id, type) {
  const url = `https://api.themoviedb.org/3/${type === "Series" ? "tv" : "movie"}/${id}?api_key=${API_KEY}&language=en-US`;
  try {
    const res = await fetch(url);
    const m = await res.json();
    const poster = m.poster_path ? IMG_URL + m.poster_path : "https://via.placeholder.com/220x330";

    const justwatchUrl = `https://www.justwatch.com/in/search?q=${encodeURIComponent(m.title || m.name)}`;
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(m.title || m.name)}`;

    let creditsRes = await fetch(`https://api.themoviedb.org/3/${type === "Series" ? "tv" : "movie"}/${id}/credits?api_key=${API_KEY}`);
    let creditsData = await creditsRes.json();
    const cast = creditsData.cast ? creditsData.cast.slice(0, 5).map(c => c.name).join(", ") : "N/A";
    const director = creditsData.crew ? creditsData.crew.filter(c => c.job === "Director").map(c => c.name).join(", ") : "N/A";

    const langs = m.spoken_languages ? m.spoken_languages.map(l => l.english_name).join(", ") : "N/A";

    modalDetails.innerHTML = `
      <div class="modal-movie">
        <img src="${poster}" alt="${m.title || m.name}">
        <div class="modal-info">
          <h2>${m.title || m.name}</h2>
          <p><strong>Release:</strong> ${(m.release_date || m.first_air_date || "N/A")}</p>
          <p><strong>Rating:</strong> ⭐ ${m.vote_average || "—"}</p>
          <p><strong>Director:</strong> ${director}</p>
          <p><strong>Cast:</strong> ${cast}</p>
          <p><strong>Languages:</strong> ${langs}</p>
          <p>${m.overview || "No description available."}</p>
          <div class="modal-links">
            <a href="${justwatchUrl}" target="_blank">Watch on JustWatch</a>
            <a href="${googleUrl}" target="_blank">Search on Google</a>
          </div>
        </div>
      </div>
    `;
    modal.classList.add("open");
  } catch (err) {
    console.error(err);
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
moodFilter.addEventListener("change", () => { currentMood = moodFilter.value; currentPage = 1; fetchMovies(); });

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
  setThemeIcon();
});

// ===== Header Logo Click - Reset to Home =====
const logo = document.querySelector("header h1");
logo.style.cursor = "pointer";

logo.addEventListener("click", () => {
  currentQuery = "";
  currentGenre = "";
  currentYear = "";
  currentSort = "popularity.desc";
  currentLang = "";
  currentMood = "";
  currentPage = 1;

  searchInput.value = "";
  genreFilter.value = "";
  yearFilter.value = ""; // ✅ FIXED reset to default option
  sortFilter.value = "popularity.desc";
  languageFilter.value = "";
  moodFilter.value = "";

  modal.classList.remove("open");
  favModal.classList.remove("open");
  watchedModal.classList.remove("open");

  fetchMovies();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== Initial Fetch =====
fetchMovies();
