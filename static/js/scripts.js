document.addEventListener("DOMContentLoaded", function () {
  loadLibraries(); // Load libraries when document is ready
});

// This function fetches the list of directories from the Flask server
function loadLibraries() {
  fetch("/directories")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((directories) => {
      const libraryListElement = document.getElementById("libraryList");
      libraryListElement.innerHTML = ""; // Clear the list first

      directories.forEach((dir) => {
        const li = document.createElement("li");
        li.textContent = dir;
        li.addEventListener("click", () => {
          // Remove 'selected' class from all list items
          const allLis = libraryListElement.querySelectorAll("li");
          allLis.forEach((item) => item.classList.remove("selected"));

          // Add 'selected' class to the clicked list item
          li.classList.add("selected");

          // Load audio files for the selected directory
          loadAudioFiles(dir);
        });
        libraryListElement.appendChild(li);
      });
    })
    .catch((error) => {
      console.error("Error fetching directories:", error);
    });
}

// This function fetches the list of audio files from the selected directory
function loadAudioFiles(directory) {
  fetch(`/files/${encodeURIComponent(directory)}`)
    .then((response) => {
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError("Received non-JSON response");
      }
      return response.json();
    })
    .then((files) => {
      if (!Array.isArray(files)) {
        console.error("Unexpected response:", files);
        alert("Failed to load files: " + (files.error || "Unknown error"));
        return; // Exit if not an array
      }
      const fileSelectElement = document.getElementById("File-Select");
      const audioListElement = document.getElementById("audioList");
      audioListElement.innerHTML = ""; // Clear the list first

      if (files.length === 0) {
        console.error("No files found or the files array is empty.");
        fileSelectElement.classList.remove("files");
        const listItem = document.createElement("li");
        listItem.classList.add("audio-item.empty");
        listItem.textContent = "No audio files available in this directory.";
        audioListElement.appendChild(listItem);
        //alert("No audio files available in this directory.");
        return; // Exit the function to prevent further execution
      }

      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        const listItem = document.createElement("li");
        listItem.classList.add("audio-item");
        listItem.setAttribute("id", "audio-file-" + i);

        const nameTrack = document.createElement("div");
        nameTrack.classList.add("name-track");

        const audioName = document.createElement("span");
        audioName.classList.add("audio-name");
        audioName.textContent = file[0];

        const timeCode = document.createElement("span");
        timeCode.classList.add("time-code");
        timeCode.textContent = formatTime(`${file[1].toFixed(2)}`);

        nameTrack.appendChild(audioName);
        listItem.appendChild(nameTrack);
        listItem.appendChild(timeCode);

        listItem.addEventListener("click", () => {
          const allLis = audioListElement.querySelectorAll("li");
          const allNames = audioListElement.querySelectorAll(".audio-name");
          allLis.forEach((item) => item.classList.remove("selected"));
          allNames.forEach((item) => item.classList.remove("long-name"));

          listItem.classList.add("selected");
          const trackRect = nameTrack.getBoundingClientRect();
          const nameRect = audioName.getBoundingClientRect();

          if (nameRect.width > trackRect.width) {
            audioName.classList.add("long-name");
          }
          console.log(trackRect.width, nameRect.width);

          playAudio(directory, file[0]);
        });

        audioListElement.appendChild(listItem);
        let currentIndex = i;
        document.getElementById("prevBtn").addEventListener("click", () => {
          let lastIndex = (currentIndex - 1 + files.length) % files.length;
          file = files[lastIndex];
          playAudio(directory, file[0]);

          const allLis = audioListElement.querySelectorAll("li");
          const allNames = audioListElement.querySelectorAll(".audio-name");
          const currentItem = document.getElementById(
            "audio-file-" + lastIndex
          );
          allLis.forEach((item) => item.classList.remove("selected"));
          allNames.forEach((item) => item.classList.remove("long-name"));

          currentItem.classList.add("selected");
          const trackRect = nameTrack.getBoundingClientRect();
          const nameRect = audioName.getBoundingClientRect();

          if (nameRect.width > trackRect.width) {
            audioName.classList.add("long-name");
          }

          currentIndex = lastIndex;
        });
        document.getElementById("nextBtn").addEventListener("click", () => {
          let nextIndex = (currentIndex + 1) % files.length;
          file = files[nextIndex];
          playAudio(directory, file[0]);

          const allLis = audioListElement.querySelectorAll("li");
          const allNames = audioListElement.querySelectorAll(".audio-name");
          const currentItem = document.getElementById(
            "audio-file-" + nextIndex
          );
          allLis.forEach((item) => item.classList.remove("selected"));
          allNames.forEach((item) => item.classList.remove("long-name"));

          currentItem.classList.add("selected");
          const trackRect = nameTrack.getBoundingClientRect();
          const nameRect = audioName.getBoundingClientRect();

          if (nameRect.width > trackRect.width) {
            audioName.classList.add("long-name");
          }

          currentIndex = nextIndex;
        });
      }

      fileSelectElement.classList.add("files");
    })
    .catch((error) => {
      console.error("Error fetching audio files:", error);
      document.getElementById("File-Select").classList.remove("files");
    });
}
let audio = new Audio(); // Global audio object
let isPlaying = false; // Track if audio is playing
let repeatAudio = false;

// Setup global event listeners for audio controls
function setupAudioControls() {
  document
    .getElementById("playPauseBtn")
    .addEventListener("click", togglePlayPause);
  document
    .getElementById("bigPlayPauseBtn")
    .addEventListener("click", togglePlayPause);
  document.getElementById("seekSlider").addEventListener("input", seekAudio);
  document.getElementById("repeatBtn").addEventListener("click", repeatToggle);

  audio.addEventListener("timeupdate", function () {
    const seekSlider = document.getElementById("seekSlider");
    const value = (audio.currentTime / audio.duration) * 100 || 0; // Calculate the current time percentage
    seekSlider.style.background = `linear-gradient(to right, #FEDE42 0%, #FEDE42 ${value}%, #ddd ${value}%, #ddd 100%)`;
    seekSlider.value = value;
    updatePlaybackTime();
  });
}

// Toggle play/pause of audio
function togglePlayPause() {
  if (!audio.src) {
    return; // Do nothing if no source is set
  }
  if (audio.paused) {
    audio.play();
    isPlaying = true;
  } else {
    audio.pause();
    isPlaying = false;
  }
  updatePlayPauseButton();
}

function updatePlaybackTime() {
  const playbackTimeElement = document.querySelector(".playback-time");
  const currentTime = formatTime(audio.currentTime);
  const duration = formatTime(audio.duration);

  playbackTimeElement.textContent = `${currentTime} / ${duration}`;
}

// Helper function to format seconds into minutes:seconds
function formatTime(timeInSeconds) {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
  return `${minutes}:${formattedSeconds}`;
}

// Update the seek slider based on current playback position
function updateSeekSlider() {
  const seekSlider = document.getElementById("seekSlider");
  seekSlider.value = (audio.currentTime / audio.duration) * 100 || 0; // Update or reset to 0 if NaN
}

// Update the play/pause button icon based on current state
function updatePlayPauseButton() {
  const iconClass = isPlaying ? "fa-pause-circle" : "fa-play-circle";
  const bigIconClass = isPlaying ? "fa-circle-pause" : "fa-circle-play";
  document.getElementById(
    "playPauseBtn"
  ).innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
  document.getElementById(
    "bigPlayPauseBtn"
  ).innerHTML = `<i class="fa-regular ${bigIconClass}"></i>`;
}

// Seek audio to new position
function seekAudio() {
  const seekSlider = document.getElementById("seekSlider");
  if (audio.duration) {
    audio.currentTime = (seekSlider.value / 100) * audio.duration;
  }
}

// Load and play a specific audio file
function playAudio(directory, file) {
  const safeDirectory = encodeURIComponent(directory);
  const safeFile = encodeURIComponent(file);

  const nowPlaying = document.getElementById("nowPlaying");
  nowPlaying.innerHTML = file;
  const playingRect = nowPlaying.getBoundingClientRect();
  const titleRect = document
    .getElementById("audioTitle")
    .getBoundingClientRect();
  if (playingRect.width > titleRect.width) {
    nowPlaying.classList.add("long-name");
  } else {
    nowPlaying.classList.remove("long-name");
  }

  audio.src = `/audio/${safeDirectory}/${safeFile}`;
  audio.addEventListener("loadeddata", () => {
    audio.play();
    isPlaying = true;
    updatePlayPauseButton();
  });
}

function scrollName(file) {
  const nameRect = file.getBoundingClientRect();
  const trackRect = document
    .getElementById("name-track")
    .getBoundingClientRect();

  if (nameRect.width > trackRect.width) {
    return true;
  } else {
    return false;
  }
}

function repeatToggle() {
  const repeatbtn = document.getElementById("repeatBtn");
  if (!repeatAudio) {
    repeatbtn.style.opacity = "1";
    repeatAudio = true;
    audio.loop = true;
  } else {
    repeatbtn.style.opacity = "0.5";
    repeatAudio = false;
    audio.loop = false;
  }
}

setupAudioControls(); // Initialize audio controls once
