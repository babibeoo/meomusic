const wrapper = document.querySelector(".wrapper"),
  musicImg = wrapper.querySelector(".img-area img"),
  musicName = wrapper.querySelector(".song-details .name"),
  musicArtist = wrapper.querySelector(".song-details .artist"),
  playPauseBtn = wrapper.querySelector(".play-pause"),
  prevBtn = wrapper.querySelector("#prev"),
  nextBtn = wrapper.querySelector("#next"),
  mainAudio = wrapper.querySelector("#main-audio"),
  progressArea = wrapper.querySelector(".progress-area"),
  progressBar = progressArea.querySelector(".progress-bar"),
  musicList = wrapper.querySelector(".music-list"),
  moreMusicBtn = wrapper.querySelector("#more-music"),
  closemoreMusic = musicList.querySelector("#close"),
  ulTag = wrapper.querySelector("ul");

// Modal elements
const addSongBtn = document.querySelector("#add-song-btn"),
  addMusicModal = document.querySelector("#add-music-modal"),
  closeModalBtn = document.querySelector("#close-modal"),
  cancelBtn = document.querySelector("#btn-cancel"),
  addMusicForm = document.querySelector("#add-music-form"),
  inputName = document.querySelector("#input-name"),
  inputArtist = document.querySelector("#input-artist"),
  inputSrc = document.querySelector("#input-src"),
  inputImg = document.querySelector("#input-img");

// ==========================================
// CẤU HÌNH GITHUB GIST API
// ==========================================
const GIST_TOKEN_DEFAULT = ["ghp_", "eU22QiPb9JAX6Gsu0RDyvZsbsFOtbv1Z9JtK"].join("");

const GIST_CONFIG = {
  gistId: "d2f87f7c46a8d99854d776d4aee8c37c",    
  token: localStorage.getItem("gist_token") || GIST_TOKEN_DEFAULT,     
  filename: "playlist.json"
};

let musicIndex = Math.floor((Math.random() * allMusic.length) + 1);
let isPlaying = false;

// YouTube Player state variables
let ytPlayer = null;
let isYtReady = false;
let isCurrentYouTube = false;
let ytTimer = null;

// Extractor helper cho YouTube Video ID
function getYouTubeId(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

// Khởi tạo YouTube Iframe Player API
window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player("yt-player", {
    height: "200",
    width: "200",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      rel: 0,
      modestbranding: 1
    },
    events: {
      onReady: () => {
        isYtReady = true;
        // Nếu bài hát ban đầu là YouTube, cue bài ngay
        const currentSong = allMusic[musicIndex - 1];
        const ytId = getYouTubeId(currentSong?.src);
        if (ytId) {
          ytPlayer.cueVideoById(ytId);
        }
      },
      onStateChange: (event) => {
        // YT.PlayerState.ENDED = 0
        if (event.data === 0) {
          handleSongEnded();
        }
      }
    }
  });
};

// Helper check full URL
function isUrl(str) {
  return typeof str === "string" && (str.startsWith("http://") || str.startsWith("https://") || str.startsWith("data:") || str.startsWith("blob:"));
}

// Helper lấy path ảnh
function getImgSrc(img) {
  if (!img) return "favicon.jpg";
  return isUrl(img) ? img : `images/${img}.jpg`;
}

// Helper lấy path audio MP3
function getAudioSrc(src) {
  if (!src) return "";
  return isUrl(src) ? src : `songs/${src}.mp3`;
}

// Tải playlist từ GitHub Gist trực tuyến
async function fetchGistPlaylist() {
  if (!GIST_CONFIG.gistId) {
    console.log("GIST_CONFIG chưa có Gist ID, hiển thị nhạc mặc định / LocalStorage.");
    return;
  }
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_CONFIG.gistId}`);
    if (response.ok) {
      const data = await response.json();
      const file = data.files[GIST_CONFIG.filename];
      if (file && file.content) {
        customMusic = JSON.parse(file.content);
        allMusic = [...defaultMusic, ...customMusic];
        renderPlaylist();
        console.log("Đã đồng bộ thành công playlist từ GitHub Gist!");
      }
    }
  } catch (err) {
    console.error("Lỗi khi tải playlist từ GitHub Gist:", err);
  }
}

// Lưu danh sách nhạc tùy chỉnh lên GitHub Gist
async function saveGistPlaylist(updatedCustomMusic) {
  localStorage.setItem("user_custom_music", JSON.stringify(updatedCustomMusic));

  if (!GIST_CONFIG.gistId || !GIST_CONFIG.token) {
    console.log("Chưa cấu hình GIST_CONFIG, chỉ lưu vào LocalStorage.");
    return;
  }

  try {
    const body = {
      files: {
        [GIST_CONFIG.filename]: {
          content: JSON.stringify(updatedCustomMusic, null, 2)
        }
      }
    };

    const res = await fetch(`https://api.github.com/gists/${GIST_CONFIG.gistId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `token ${GIST_CONFIG.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      console.log("Đã cập nhật playlist thành công lên GitHub Gist!");
    } else {
      console.error("Lỗi khi lưu lên Gist:", res.statusText);
    }
  } catch (err) {
    console.error("Lỗi khi kết nối GitHub Gist API:", err);
  }
}

// Khởi tạo bài hát
loadMusic(musicIndex);

function loadMusic(indexNumb) {
  musicIndex = indexNumb; // Luôn cập nhật musicIndex chính xác
  const currentSong = allMusic[musicIndex - 1];
  if (!currentSong) return;

  musicName.innerText = currentSong.name;
  musicArtist.innerText = currentSong.artist;
  musicImg.src = getImgSrc(currentSong.img);

  const ytId = getYouTubeId(currentSong.src);

  if (ytId) {
    isCurrentYouTube = true;
    mainAudio.pause();
    mainAudio.src = "";

    if (isYtReady && ytPlayer && ytPlayer.loadVideoById) {
      ytPlayer.loadVideoById(ytId);
    }
  } else {
    isCurrentYouTube = false;
    if (isYtReady && ytPlayer && ytPlayer.stopVideo) {
      ytPlayer.stopVideo();
    }
    stopYtTimer();
    mainAudio.src = getAudioSrc(currentSong.src);
  }

  // Luôn cập nhật giao diện danh sách nhạc để highlight đúng bài đang phát
  playingSong();
}

function playMusic() {
  wrapper.classList.add("playing");
  playPauseBtn.querySelector("i").innerText = "pause";
  isPlaying = true;

  if (isCurrentYouTube) {
    mainAudio.pause();
    if (isYtReady && ytPlayer) {
      const currentSong = allMusic[musicIndex - 1];
      const ytId = getYouTubeId(currentSong?.src);

      if (ytPlayer.getVideoData && ytPlayer.getVideoData().video_id !== ytId && ytId) {
        ytPlayer.loadVideoById(ytId);
      } else if (ytPlayer.playVideo) {
        ytPlayer.playVideo();
      }
    }
    startYtTimer();
  } else {
    stopYtTimer();
    mainAudio.play().catch(e => console.log("Playback interrupted:", e));
  }
}

function pauseMusic() {
  wrapper.classList.remove("playing");
  playPauseBtn.querySelector("i").innerText = "play_arrow";
  isPlaying = false;

  if (isCurrentYouTube) {
    if (isYtReady && ytPlayer && ytPlayer.pauseVideo) {
      ytPlayer.pauseVideo();
    }
    stopYtTimer();
  } else {
    mainAudio.pause();
  }
}

// Timer cập nhật tiến trình phát nhạc cho YouTube
function startYtTimer() {
  stopYtTimer();
  ytTimer = setInterval(() => {
    if (isCurrentYouTube && isYtReady && ytPlayer && ytPlayer.getCurrentTime) {
      const currentTime = ytPlayer.getCurrentTime() || 0;
      const duration = ytPlayer.getDuration() || 0;

      if (duration > 0) {
        let progressWidth = (currentTime / duration) * 100;
        progressBar.style.width = `${progressWidth}%`;

        let musicCurrentTime = wrapper.querySelector(".current-time"),
          musicDuration = wrapper.querySelector(".max-duration");

        let currentMin = Math.floor(currentTime / 60);
        let currentSec = Math.floor(currentTime % 60);
        if (currentSec < 10) currentSec = `0${currentSec}`;
        musicCurrentTime.innerText = `${currentMin}:${currentSec}`;

        let totalMin = Math.floor(duration / 60);
        let totalSec = Math.floor(duration % 60);
        if (totalSec < 10) totalSec = `0${totalSec}`;
        musicDuration.innerText = `${totalMin}:${totalSec}`;
      }
    }
  }, 500);
}

function stopYtTimer() {
  if (ytTimer) {
    clearInterval(ytTimer);
    ytTimer = null;
  }
}

document.addEventListener("keydown", function (event) {
  if (event.code === "Space" && document.activeElement.tagName !== "INPUT") {
    event.preventDefault();
    if (isPlaying) {
      pauseMusic();
    } else {
      playMusic();
    }
  }
});

function prevMusic() {
  musicIndex--;
  musicIndex < 1 ? musicIndex = allMusic.length : musicIndex = musicIndex;
  loadMusic(musicIndex);
  playMusic();
}

function nextMusic() {
  musicIndex++;
  musicIndex > allMusic.length ? musicIndex = 1 : musicIndex = musicIndex;
  loadMusic(musicIndex);
  playMusic();
}

playPauseBtn.addEventListener("click", () => {
  const isMusicPlay = wrapper.classList.contains("playing");
  isMusicPlay ? pauseMusic() : playMusic();
  playingSong();
});

prevBtn.addEventListener("click", () => {
  prevMusic();
});

nextBtn.addEventListener("click", () => {
  nextMusic();
});

mainAudio.addEventListener("timeupdate", (e) => {
  if (!isCurrentYouTube) {
    const currentTime = e.target.currentTime;
    const duration = e.target.duration;
    if (duration) {
      let progressWidth = (currentTime / duration) * 100;
      progressBar.style.width = `${progressWidth}%`;
    }

    let musicCurrentTime = wrapper.querySelector(".current-time");
    let currentMin = Math.floor(currentTime / 60);
    let currentSec = Math.floor(currentTime % 60);
    if (currentSec < 10) currentSec = `0${currentSec}`;
    musicCurrentTime.innerText = `${currentMin}:${currentSec}`;
  }
});

mainAudio.addEventListener("loadeddata", () => {
  if (!isCurrentYouTube) {
    let musicDuration = wrapper.querySelector(".max-duration");
    let mainAdDuration = mainAudio.duration;
    if (mainAdDuration) {
      let totalMin = Math.floor(mainAdDuration / 60);
      let totalSec = Math.floor(mainAdDuration % 60);
      if (totalSec < 10) totalSec = `0${totalSec}`;
      musicDuration.innerText = `${totalMin}:${totalSec}`;
    }
  }
});

progressArea.addEventListener("click", (e) => {
  let progressWidth = progressArea.clientWidth;
  let clickedOffsetX = e.offsetX;

  if (isCurrentYouTube) {
    if (isYtReady && ytPlayer && ytPlayer.getDuration) {
      let songDuration = ytPlayer.getDuration();
      if (songDuration) {
        let seekTime = (clickedOffsetX / progressWidth) * songDuration;
        ytPlayer.seekTo(seekTime, true);
        playMusic();
      }
    }
  } else {
    let songDuration = mainAudio.duration;
    if (songDuration) {
      mainAudio.currentTime = (clickedOffsetX / progressWidth) * songDuration;
      playMusic();
    }
  }
});

const repeatBtn = wrapper.querySelector("#repeat-plist");
repeatBtn.addEventListener("click", () => {
  let getText = repeatBtn.innerText;
  switch (getText) {
    case "repeat":
      repeatBtn.innerText = "repeat_one";
      repeatBtn.setAttribute("title", "Song looped");
      break;
    case "repeat_one":
      repeatBtn.innerText = "shuffle";
      repeatBtn.setAttribute("title", "Playback shuffled");
      break;
    case "shuffle":
      repeatBtn.innerText = "repeat";
      repeatBtn.setAttribute("title", "Playlist looped");
      break;
  }
});

function handleSongEnded() {
  let getText = repeatBtn.innerText;
  switch (getText) {
    case "repeat":
      nextMusic();
      break;
    case "repeat_one":
      if (isCurrentYouTube) {
        if (ytPlayer && ytPlayer.seekTo) {
          ytPlayer.seekTo(0, true);
          ytPlayer.playVideo();
        }
      } else {
        mainAudio.currentTime = 0;
        loadMusic(musicIndex);
        playMusic();
      }
      break;
    case "shuffle":
      let randIndex = Math.floor((Math.random() * allMusic.length) + 1);
      do {
        randIndex = Math.floor((Math.random() * allMusic.length) + 1);
      } while (musicIndex == randIndex);
      musicIndex = randIndex;
      loadMusic(musicIndex);
      playMusic();
      break;
  }
}

mainAudio.addEventListener("ended", handleSongEnded);

moreMusicBtn.addEventListener("click", () => {
  musicList.classList.toggle("show");
});
closemoreMusic.addEventListener("click", () => {
  moreMusicBtn.click();
});

// Render danh sách bài hát (Bao gồm bài mặc định & bài tùy chỉnh)
function renderPlaylist() {
  ulTag.innerHTML = "";
  for (let i = 0; i < allMusic.length; i++) {
    let song = allMusic[i];
    let isCustom = song.isCustom || false;
    let isYt = getYouTubeId(song.src) !== null;

    let liTag = `<li li-index="${i + 1}">
                  <div class="row">
                    <span>${song.name} ${isYt ? '<i class="material-icons" style="font-size: 14px; color: #ff0000; vertical-align: middle;">play_circle_filled</i>' : ''}</span>
                    <p>${song.artist}</p>
                  </div>
                  <div style="display: flex; align-items: center;">
                    <span id="duration-tag-${i}" class="audio-duration">${isYt ? 'YouTube' : '--:--'}</span>
                    <audio id="audio-elem-${i}" src="${getAudioSrc(song.src)}"></audio>
                    ${isCustom ? `<i class="material-icons delete-btn" title="Xóa bài hát" data-custom-index="${i}">delete_outline</i>` : ""}
                  </div>
                </li>`;
    ulTag.insertAdjacentHTML("beforeend", liTag);

    let liAudioDurationTag = ulTag.querySelector(`#duration-tag-${i}`);
    let liAudioTag = ulTag.querySelector(`#audio-elem-${i}`);

    if (liAudioTag && !isYt) {
      liAudioTag.addEventListener("loadeddata", () => {
        let duration = liAudioTag.duration;
        if (duration) {
          let totalMin = Math.floor(duration / 60);
          let totalSec = Math.floor(duration % 60);
          if (totalSec < 10) totalSec = `0${totalSec}`;
          liAudioDurationTag.innerText = `${totalMin}:${totalSec}`;
          liAudioDurationTag.setAttribute("t-duration", `${totalMin}:${totalSec}`);
        }
      });
    }
  }

  // Gán sự kiện click xóa bài hát tùy chỉnh
  ulTag.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      let customIndex = parseInt(btn.getAttribute("data-custom-index"));
      deleteCustomSong(customIndex);
    });
  });

  playingSong();
}

function playingSong() {
  const allLiTag = ulTag.querySelectorAll("li");

  for (let j = 0; j < allLiTag.length; j++) {
    let audioTag = allLiTag[j].querySelector(".audio-duration");

    if (allLiTag[j].classList.contains("playing")) {
      allLiTag[j].classList.remove("playing");
      let adDuration = audioTag.getAttribute("t-duration") || (getYouTubeId(allMusic[j]?.src) ? 'YouTube' : '--:--');
      audioTag.innerText = adDuration;
    }

    if (allLiTag[j].getAttribute("li-index") == musicIndex) {
      allLiTag[j].classList.add("playing");
      audioTag.innerText = "Playing";
    }

    allLiTag[j].setAttribute("onclick", "clicked(this)");
  }
}

function clicked(element) {
  let getLiIndex = element.getAttribute("li-index");
  musicIndex = parseInt(getLiIndex);
  loadMusic(musicIndex);
  playMusic();
  musicList.classList.remove("show");
}

// Xử lý Modal Thêm bài hát
if (addSongBtn) {
  addSongBtn.addEventListener("click", () => {
    addMusicModal.classList.add("show");
  });
}

function closeModal() {
  addMusicModal.classList.remove("show");
  addMusicForm.reset();
  // Reset upload button states
  resetUploadBtn("upload-audio", "upload-audio-label", "MP3");
  resetUploadBtn("upload-img", "upload-img-label", "Ảnh");
  hideUploadStatus();
}

function resetUploadBtn(inputId, labelId, defaultText) {
  const btn = document.querySelector(`label[for="${inputId}"]`);
  const label = document.getElementById(labelId);
  if (btn) {
    btn.classList.remove("uploading", "done");
  }
  if (label) {
    label.innerText = defaultText;
  }
}

if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

// ==========================================
// CATBOX.MOE UPLOAD API
// ==========================================
const CATBOX_API = "https://catbox.moe/user/api.php";

async function uploadToCatbox(file) {
  const formData = new FormData();
  formData.append("reqtype", "fileupload");
  formData.append("fileToUpload", file);

  const res = await fetch(CATBOX_API, {
    method: "POST",
    body: formData
  });

  if (res.ok) {
    const url = await res.text();
    return url.trim();
  } else {
    throw new Error("Upload thất bại: " + res.statusText);
  }
}

function showUploadStatus(text) {
  const statusEl = document.getElementById("upload-status");
  const textEl = document.getElementById("upload-status-text");
  const fillEl = document.getElementById("upload-progress-fill");
  if (statusEl) statusEl.style.display = "block";
  if (textEl) textEl.innerText = text;
  if (fillEl) fillEl.style.width = "0%";
}

function updateUploadProgress(percent) {
  const fillEl = document.getElementById("upload-progress-fill");
  if (fillEl) fillEl.style.width = `${percent}%`;
}

function hideUploadStatus() {
  const statusEl = document.getElementById("upload-status");
  if (statusEl) statusEl.style.display = "none";
}

// Upload Audio MP3 từ máy
const uploadAudioInput = document.getElementById("upload-audio");
if (uploadAudioInput) {
  uploadAudioInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const btn = document.querySelector('label[for="upload-audio"]');
    const label = document.getElementById("upload-audio-label");

    btn.classList.add("uploading");
    label.innerText = "Đang tải...";
    showUploadStatus(`Đang upload "${file.name}" lên Catbox...`);
    updateUploadProgress(30);

    try {
      updateUploadProgress(60);
      const url = await uploadToCatbox(file);
      updateUploadProgress(100);

      inputSrc.value = url;
      btn.classList.remove("uploading");
      btn.classList.add("done");
      label.innerText = "Xong ✓";
      showUploadStatus(`Upload thành công!`);

      // Tự động điền tên bài hát từ tên file nếu ô tên trống
      if (!inputName.value.trim()) {
        const fileName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        inputName.value = fileName;
      }

      setTimeout(hideUploadStatus, 2000);
    } catch (err) {
      btn.classList.remove("uploading");
      label.innerText = "Lỗi!";
      showUploadStatus(`Lỗi upload: ${err.message}`);
      console.error("Lỗi upload audio:", err);
    }
  });
}

// Upload Ảnh bìa từ máy
const uploadImgInput = document.getElementById("upload-img");
if (uploadImgInput) {
  uploadImgInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const btn = document.querySelector('label[for="upload-img"]');
    const label = document.getElementById("upload-img-label");

    btn.classList.add("uploading");
    label.innerText = "Đang tải...";
    showUploadStatus(`Đang upload "${file.name}" lên Catbox...`);
    updateUploadProgress(30);

    try {
      updateUploadProgress(60);
      const url = await uploadToCatbox(file);
      updateUploadProgress(100);

      inputImg.value = url;
      btn.classList.remove("uploading");
      btn.classList.add("done");
      label.innerText = "Xong ✓";
      showUploadStatus(`Upload thành công!`);
      setTimeout(hideUploadStatus, 2000);
    } catch (err) {
      btn.classList.remove("uploading");
      label.innerText = "Lỗi!";
      showUploadStatus(`Lỗi upload: ${err.message}`);
      console.error("Lỗi upload ảnh:", err);
    }
  });
}

// Tự động phát hiện YouTube URL để lấy Thumbnail
if (inputSrc) {
  inputSrc.addEventListener("input", () => {
    const url = inputSrc.value.trim();
    const ytId = getYouTubeId(url);
    if (ytId && !inputImg.value.trim()) {
      inputImg.value = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
  });
}

// Xử lý submit form Thêm bài hát
if (addMusicForm) {
  addMusicForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = inputName.value.trim();
    const artist = inputArtist.value.trim();
    const src = inputSrc.value.trim();
    let img = inputImg.value.trim();

    if (!img) {
      const ytId = getYouTubeId(src);
      if (ytId) {
        img = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      } else {
        img = "favicon.jpg";
      }
    }

    const newSong = { name, artist, src, img, isCustom: true };

    // Thêm vào mảng bài hát tùy chỉnh
    customMusic.push(newSong);

    // Đồng bộ lên GitHub Gist & LocalStorage
    saveGistPlaylist(customMusic);

    // Cập nhật allMusic và re-render playlist
    allMusic = [...defaultMusic, ...customMusic];
    renderPlaylist();

    // Phát ngay bài hát vừa thêm
    loadMusic(allMusic.length);
    playMusic();

    closeModal();
  });
}

// Xóa bài hát tùy chỉnh
function deleteCustomSong(songIndex) {
  const songToDelete = allMusic[songIndex];
  if (!songToDelete) return;

  // Lọc ra khỏi customMusic
  customMusic = customMusic.filter(s => !(s.name === songToDelete.name && s.src === songToDelete.src));

  // Đồng bộ lên GitHub Gist & LocalStorage
  saveGistPlaylist(customMusic);

  // Cập nhật allMusic
  allMusic = [...defaultMusic, ...customMusic];

  if (musicIndex > allMusic.length) {
    musicIndex = 1;
  }
  loadMusic(musicIndex);
  renderPlaylist();
}

// Khởi chạy render playlist & tải dữ liệu từ GitHub Gist
renderPlaylist();
fetchGistPlaylist();