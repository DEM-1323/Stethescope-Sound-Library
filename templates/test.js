document
  .getElementById("playPauseBtn")
  .addEventListener("click", togglePlayPause);
document
  .getElementById("bigPlayPauseBtn")
  .addEventListener("click", togglePlayPause);
document.getElementById("seekSlider").addEventListener("input", seekAudio);

let audio = new Audio("Bronchial.mp3");
let isPlaying = false;

function togglePlayPause() {
  if (isPlaying) {
    audio.pause();
  } else {
    audio.play();
  }
  isPlaying = !isPlaying;
  updatePlayPauseButton();
}

function updatePlayPauseButton() {
  let playPauseBtn = document.getElementById("playPauseBtn");
  let bigPlayPauseBtn = document.getElementById("bigPlayPauseBtn");
  playPauseBtn.innerHTML = isPlaying
    ? '<i class="fas fa-pause"></i>'
    : '<i class="fas fa-play"></i>';
  bigPlayPauseBtn.innerHTML = isPlaying
    ? '<i class="fa-regular fa-circle-pause"></i>'
    : '<i class="fa-regular fa-circle-play"></i>';
}

function seekAudio() {
  let seekSlider = document.getElementById("seekSlider");
  audio.currentTime = audio.duration * (seekSlider.value / 100);
}

audio.addEventListener("timeupdate", function () {
  let seekSlider = document.getElementById("seekSlider");
  seekSlider.value = (audio.currentTime / audio.duration) * 100;
});
