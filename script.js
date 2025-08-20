const API_KEY = "ab69dd0914ac5043d1afcd1ee933c354";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let currentPage = 1;
let currentQuery = "";
let currentGenre = "";
let currentYear = "";
let currentSort = "popularity.desc";
let loading = false;
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

// Elements
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
const loadingDiv = document.getElementById("loading");

const favBtn = document.getElementById("favorites-btn");
const favModal = document.getElementById("favorites-modal");
const closeFav = document.getElementById("closeFavorites");
const favList = document.getElementById("favorites-list");
const clearFavBtn = document.getElementById("clear-favorites");

// ===== Theme Initialization =====
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") {
  document.body.classList.add("light");
}
setThemeIcon();

// ===== Fetch Movies =====
async function fetchMovies(append = false) {
  if (loading) return;
  loading = true;
  loadingDiv.classList.remove("hidden");

  let url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&page=${currentPage}&sort_by=${currentSort}`;
  if (currentQuery) {
    url = `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(currentQuery)}&page=${currentPage}`;
  }
  if (currentGenre) url += `&with_genres=${currentGenre}`;
  if (currentYear) url += `&primary_release_year=${currentYear}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    let movies = filterAdultRomance(data.results || []);

    if (!append) moviesDiv.innerHTML = "";
    if (!append && movies.length === 0) {
      moviesDiv.innerHTML = `
        <div class="empty">
          <img src="https://cdn-icons-png.flaticon.com/512/4076/4076549.png" alt="No results" />
          <p>No results found 😔</p>
        </div>
      `;
      pageInfo.textContent = `Page ${currentPage}`;
      return;
    }

    displayMovies(movies);
    pageInfo.textContent = `Page ${currentPage}`;
  } catch (err) {
    moviesDiv.innerHTML = `
      <div class="empty">
        <img src="https://cdn-icons-png.flaticon.com/512/3917/3917375.png" alt="Error" />
        <p>⚠ Error fetching movies. Try again later.</p>
      </div>
    `;
  } finally {
    loading = false;
    loadingDiv.classList.add("hidden");
  }
}

// ===== Adult/Romance Filter =====
function filterAdultRomance(movies) {
  const romanceId = 10749;
  const blacklist = ["erotic", "porn", "xxx", "adult", "nude", "sex"];
  return movies.filter(m => {
    if (m.adult) return false;
    if (m.media_type === "person") return false;
    const isRomance =
      (m.genre_ids && m.genre_ids.includes(romanceId)) ||
      (m.genres && m.genres.some(g => g.id === romanceId));
    if (isRomance) {
      const text = ((m.title || m.name || "") + " " + (m.overview || "")).toLowerCase();
      if (blacklist.some(word => text.includes(word))) return false;
    }
    return true;
  });
}

// ===== Display Movies (with hover overlay + fav button) =====
function displayMovies(movies) {
  movies.forEach(m => {
    const type = m.media_type === "tv" ? "Series" : "Movie";
    const poster = m.poster_path ? IMG_URL + m.poster_path : "https://via.placeholder.com/180x250";
    const rating = m.vote_average ? m.vote_average.toFixed(1) : "—";
    const year = (m.release_date || m.first_air_date || "N/A").slice(0, 4);

    const div = document.createElement("div");
    div.classList.add("movie");

    // Heart state
    const isFav = favorites.find(f => f.id === m.id);

    div.innerHTML = `
      <img src="${poster}" alt="${m.title || m.name}">
      <button class="fav-btn corner" title="Toggle favorite" aria-label="Toggle favorite">
        <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
      </button>
      <h3>${m.title || m.name}</h3>
      <span>${type}</span>
      <div class="rating-inline">⭐ ${rating}</div>

      <div class="overlay">
        <div class="ov-rating">⭐ ${rating}</div>
        <div class="ov-year">${year !== "N/A" ? year : ""}</div>
        <button class="fav-btn" title="Add to favorites">
          <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i> Favorite
        </button>
      </div>
    `;

    // Click poster to open details
    div.querySelector("img").addEventListener("click", () => showDetails(m.id, type));

    // Favorite buttons (corner + overlay)
    const cornerFavBtn = div.querySelector(".corner i");
    const overlayFavBtn = div.querySelector(".overlay .fav-btn i");
    const toggleBothIcons = () => {
      cornerFavBtn.classList.toggle("fa-solid");
      cornerFavBtn.classList.toggle("fa-regular");
      overlayFavBtn.classList.toggle("fa-solid");
      overlayFavBtn.classList.toggle("fa-regular");
    };

    const toggleFavHandler = (e) => {
      e.stopPropagation();
      toggleFavorite(m);
      toggleBothIcons();
    };

    div.querySelector(".corner").addEventListener("click", toggleFavHandler);
    div.querySelector(".overlay .fav-btn").addEventListener("click", toggleFavHandler);

    moviesDiv.appendChild(div);
  });
}

// ===== Show Modal Details =====
async function showDetails(id, type) {
  const endpoint = type === "Series" ? "tv" : "movie";
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${endpoint}/${id}?api_key=${API_KEY}&append_to_response=credits,watch/providers`
    );
    const data = await res.json();

    const cast = data.credits?.cast?.slice(0, 5).map(c => c.name).join(", ") || "N/A";
    const director = data.credits?.crew?.find(c => c.job === "Director")?.name || "N/A";
    const poster = data.poster_path ? IMG_URL + data.poster_path : "https://via.placeholder.com/300x450";

    let ottLinks = "N/A";
    const providersData = data["watch/providers"]?.results;
    let region = "IN";
    if (!providersData?.IN) {
      region = Object.keys(providersData || {})[0];
    }
    if (providersData && providersData[region]) {
      const regionProviders = [
        ...(providersData[region].flatrate || []),
        ...(providersData[region].rent || []),
        ...(providersData[region].buy || []),
        ...(providersData[region].ads || []),
        ...(providersData[region].free || [])
      ];
      if (regionProviders.length > 0) {
        const jwUrl = `https://www.justwatch.com/${region.toLowerCase()}/search?q=${encodeURIComponent(data.title || data.name)}`;
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(data.title || data.name)}`;
        ottLinks = `<a href="${jwUrl}" target="_blank">JustWatch</a> | <a href="${googleUrl}" target="_blank">Google</a>`;
      } else {
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(data.title || data.name)}`;
        ottLinks = `<a href="${googleUrl}" target="_blank">Google</a>`;
      }
    } else {
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(data.title || data.name)}`;
      ottLinks = `<a href="${googleUrl}" target="_blank">Google</a>`;
    }

    modalDetails.innerHTML = `
      <img src="${poster}" alt="${data.title || data.name}">
      <h2>${data.title || data.name}</h2>
      <p><b>Overview:</b> ${data.overview || "No description."}</p>
      <p><b>Release:</b> ${data.release_date || data.first_air_date || "N/A"}</p>
      <p><b>Rating:</b> ⭐ ${data.vote_average || "N/A"}</p>
      <p><b>Genres:</b> ${data.genres?.map(g => g.name).join(", ") || "N/A"}</p>
      <p><b>Cast:</b> ${cast}</p>
      <p><b>Director:</b> ${director}</p>
      <p><b>Watch:</b> ${ottLinks}</p>
    `;
    modal.style.display = "flex";
  } catch (err) {
    modalDetails.innerHTML = `
      <div class="empty">
        <img src="https://cdn-icons-png.flaticon.com/512/3917/3917375.png" alt="Error" />
        <p>⚠ Error loading details.</p>
      </div>
    `;
    modal.style.display = "flex";
  }
}

// ===== Favorites =====
function toggleFavorite(movie) {
  const exists = favorites.find(f => f.id === movie.id);
  if (exists) {
    favorites = favorites.filter(f => f.id !== movie.id);
  } else {
    favorites.push(movie);
  }
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function renderFavorites() {
  favList.innerHTML = "";
  if (favorites.length === 0) {
    favList.innerHTML = `
      <div class="empty">
        <img src="https://cdn-icons-png.flaticon.com/512/6598/6598519.png" alt="Empty favorites" />
        <p>No favorites yet. Add some ❤️</p>
      </div>
    `;
    return;
  }
  favorites.forEach(m => {
    const div = document.createElement("div");
    div.classList.add("fav-item");
    const poster = m.poster_path ? IMG_URL + m.poster_path : "https://via.placeholder.com/100x150";
    div.innerHTML = `
      <img src="${poster}" alt="${m.title || m.name}">
      <span>${m.title || m.name}</span>
      <button class="remove-btn" title="Remove from favorites">❌</button>
    `;
    div.querySelector(".remove-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      removeFavorite(m.id);
      renderFavorites();
    });
    div.querySelector("img").addEventListener("click", () => {
      showDetails(m.id, m.media_type === "tv" ? "Series" : "Movie");
      favModal.style.display = "none";
    });
    favList.appendChild(div);
  });
}

function removeFavorite(id) {
  favorites = favorites.filter(f => f.id !== id);
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

// ===== Theme helpers =====
function setThemeIcon() {
  const isLight = document.body.classList.contains("light");
  themeToggle.innerHTML = isLight
    ? '<i class="fa-solid fa-moon"></i>'
    : '<i class="fa-solid fa-sun"></i>';
}

// ===== Event Listeners =====
searchBtn.addEventListener("click", () => {
  currentQuery = searchInput.value.trim();
  currentPage = 1;
  fetchMovies();
});

nextBtn.addEventListener("click", () => {
  currentPage++;
  fetchMovies();
});

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    fetchMovies();
  }
});

closeModal.addEventListener("click", () => (modal.style.display = "none"));
closeFav.addEventListener("click", () => (favModal.style.display = "none"));

favBtn.addEventListener("click", () => {
  renderFavorites();
  favModal.style.display = "flex";
});

clearFavBtn.addEventListener("click", () => {
  favorites = [];
  localStorage.setItem("favorites", JSON.stringify(favorites));
  renderFavorites();
});

// Theme toggle with icons + persistence
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  localStorage.setItem("theme", isLight ? "light" : "dark");
  setThemeIcon();
});

genreFilter.addEventListener("change", (e) => {
  currentGenre = e.target.value;
  currentPage = 1;
  fetchMovies();
});

yearFilter.addEventListener("change", (e) => {
  currentYear = e.target.value;
  currentPage = 1;
  fetchMovies();
});

sortFilter.addEventListener("change", (e) => {
  currentSort = e.target.value;
  currentPage = 1;
  fetchMovies();
});

// Infinite Scroll
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    currentPage++;
    fetchMovies(true);
  }
});

// Initial Load
fetchMovies();
