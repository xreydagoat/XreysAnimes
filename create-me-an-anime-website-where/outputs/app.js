const shows = [
  {
    title: "Azumanga Daioh",
    type: "Series",
    genre: "Comedy, Slice of Life",
    poster: "images/azumanga-daioh-cover.jpg",
    backdrop: "images/azumanga-daioh-backdrop.svg",
    description:
      "Azumanga Daioh follows a wonderfully odd class through everyday school life, where ordinary lessons turn into deadpan jokes, strange daydreams, chaotic friendships, and tiny moments that somehow become unforgettable. Episodes 1-10 are loaded locally and ready to watch.",
    episodes: [
      { label: "Episode 1", url: "videos/azumanga-daioh/episode-01.mp4" },
      { label: "Episode 2", url: "videos/azumanga-daioh/episode-02.mp4" },
      { label: "Episode 3", url: "videos/azumanga-daioh/episode-03.mp4" },
      { label: "Episode 4", url: "videos/azumanga-daioh/episode-04.mp4" },
      { label: "Episode 5", url: "videos/azumanga-daioh/episode-05.mp4" },
      { label: "Episode 6", url: "videos/azumanga-daioh/episode-06.mp4" },
      { label: "Episode 7", url: "videos/azumanga-daioh/episode-07.mp4" },
      { label: "Episode 8", url: "videos/azumanga-daioh/episode-08.mp4" },
      { label: "Episode 9", url: "videos/azumanga-daioh/episode-09.mp4" },
      { label: "Episode 10", url: "videos/azumanga-daioh/episode-10.mp4" },
    ],
  },
];

let selectedShow = null;
let activeFilter = "all";

const hero = document.getElementById("hero");
const heroCover = document.getElementById("heroCover");
const heroTitle = document.getElementById("heroTitle");
const heroDescription = document.getElementById("heroDescription");
const heroStatus = document.getElementById("heroStatus");
const watchHero = document.getElementById("watchHero");
const animeGrid = document.getElementById("animeGrid");
const emptyState = document.getElementById("emptyState");
const resultCount = document.getElementById("resultCount");
const sectionTitle = document.getElementById("sectionTitle");
const searchInput = document.getElementById("searchInput");
const playerModal = document.getElementById("playerModal");
const playerTitle = document.getElementById("playerTitle");
const playerMeta = document.getElementById("playerMeta");
const videoFrame = document.getElementById("videoFrame");
const episodeRow = document.getElementById("episodeRow");
const backSkip = document.getElementById("backSkip");
const forwardSkip = document.getElementById("forwardSkip");
const autoSkipToggle = document.getElementById("autoSkipToggle");

let currentVideo = null;
let currentAutoSkip = null;
let currentBlobUrl = null;

const skipWindows = {
  intro: { start: 0, end: 88 },
  outro: { start: 1322, end: 1418 },
};

function showHero(show) {
  selectedShow = show;
  hero.classList.toggle("has-show", Boolean(show));

  if (!show) {
    heroTitle.textContent = "Xreys Animes";
    heroDescription.textContent = "Browse your anime library in Xreys Animes.";
    heroStatus.textContent = "Library";
    heroCover.removeAttribute("src");
    heroCover.alt = "";
    watchHero.disabled = true;
    watchHero.innerHTML = '<i data-lucide="play"></i>Nothing loaded';
    lucide.createIcons();
    return;
  }

  hero.style.setProperty("--hero-image", `url("${show.backdrop}")`);
  heroCover.src = show.poster;
  heroCover.alt = `${show.title} cover`;
  heroTitle.textContent = show.title;
  heroDescription.textContent = show.description;
  heroStatus.textContent = `${show.episodes.length} episodes ready`;
  watchHero.disabled = false;
  watchHero.innerHTML = '<i data-lucide="play"></i>Watch now';
  lucide.createIcons();
}

function filteredShows() {
  const query = searchInput.value.trim().toLowerCase();
  return shows.filter((show) => {
    const matchesFilter = activeFilter === "all" || activeFilter === "watching" || show.type === activeFilter;
    const matchesSearch = [show.title, show.genre].join(" ").toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
}

function renderCards() {
  const list = filteredShows();
  animeGrid.innerHTML = "";
  resultCount.textContent = `${list.length} shows`;
  sectionTitle.textContent = activeFilter === "Movie" ? "Movies" : activeFilter === "Series" ? "Series" : "Shows";
  emptyState.hidden = list.length > 0;

  list.forEach((show) => {
    const card = document.createElement("button");
    card.className = "anime-card";
    card.innerHTML = `
      <img class="poster" src="${show.poster}" alt="${show.title} poster" loading="lazy">
      <span class="card-body">
        <h3>${show.title}</h3>
        <span class="rating">${show.episodes.length} episodes</span>
        <span class="genre">${show.genre || show.type}</span>
      </span>
    `;
    card.addEventListener("click", () => showHero(show));
    animeGrid.appendChild(card);
  });
}

function normalizeVideo(url) {
  if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
  if (url.includes("youtu.be/")) return `https://www.youtube-nocookie.com/embed/${url.split("youtu.be/")[1].split("?")[0]}`;
  return url;
}

async function playEpisode(show, episode, index) {
  const url = normalizeVideo(episode.url);
  playerTitle.textContent = show.title;
  playerMeta.textContent = episode.label;

  [...episodeRow.children].forEach((button, buttonIndex) => button.classList.toggle("active", buttonIndex === index));

  if (!url.match(/\.(mp4|webm|ogg|mkv)(\?.*)?$/i)) {
    releaseCurrentBlob();
    videoFrame.innerHTML = `<iframe src="${url}" title="${show.title} ${episode.label}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    bindCurrentVideo();
    return;
  }

  releaseCurrentBlob();
  videoFrame.innerHTML = '<div class="video-loading">Loading episode...</div>';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load ${episode.label}`);
    const blob = await response.blob();
    currentBlobUrl = URL.createObjectURL(blob);
    videoFrame.innerHTML = `<video src="${currentBlobUrl}" controls autoplay controlsList="nodownload noplaybackrate" disablePictureInPicture oncontextmenu="return false"></video>`;
    bindCurrentVideo();
  } catch (error) {
    videoFrame.innerHTML = `<div class="video-loading">Episode could not load.</div>`;
    console.error(error);
  }
}

function bindCurrentVideo() {
  if (currentVideo && currentAutoSkip) {
    currentVideo.removeEventListener("timeupdate", currentAutoSkip);
  }

  currentVideo = videoFrame.querySelector("video");
  if (!currentVideo) return;

  currentAutoSkip = () => {
    if (!autoSkipToggle.checked) return;

    const time = currentVideo.currentTime;
    const nearIntro = time >= skipWindows.intro.start && time < skipWindows.intro.end;
    const nearOutro = time >= skipWindows.outro.start && time < skipWindows.outro.end;

    if (nearIntro) currentVideo.currentTime = skipWindows.intro.end;
    if (nearOutro) currentVideo.currentTime = skipWindows.outro.end;
  };

  currentVideo.addEventListener("timeupdate", currentAutoSkip);
}

function skipBy(seconds) {
  if (!currentVideo) return;
  const duration = Number.isFinite(currentVideo.duration) ? currentVideo.duration : currentVideo.currentTime + seconds;
  const nextTime = Math.min(Math.max(currentVideo.currentTime + seconds, 0), duration);
  if (typeof currentVideo.fastSeek === "function") {
    currentVideo.fastSeek(nextTime);
  } else {
    currentVideo.currentTime = nextTime;
  }
}

function releaseCurrentBlob() {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
}

function openPlayer(show) {
  if (!show) return;
  episodeRow.innerHTML = "";
  show.episodes.forEach((episode, index) => {
    const button = document.createElement("button");
    button.textContent = episode.label;
    button.addEventListener("click", () => playEpisode(show, episode, index));
    episodeRow.appendChild(button);
  });
  playerModal.showModal();
  playEpisode(show, show.episodes[0], 0);
}

function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("active", button.dataset.filter === filter));
  renderCards();
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

watchHero.addEventListener("click", () => openPlayer(selectedShow));
document.getElementById("closePlayer").addEventListener("click", () => {
  videoFrame.innerHTML = "";
  currentVideo = null;
  currentAutoSkip = null;
  releaseCurrentBlob();
  playerModal.close();
});
backSkip.addEventListener("click", () => skipBy(-10));
forwardSkip.addEventListener("click", () => skipBy(10));
searchInput.addEventListener("input", renderCards);

showHero(shows[0] || null);
renderCards();
lucide.createIcons();
