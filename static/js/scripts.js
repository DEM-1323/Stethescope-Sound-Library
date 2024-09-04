document.addEventListener("DOMContentLoaded", function () {
  loadLibraries(); // Load libraries when document is ready
});

// Global variables
let audio = new Audio(); // Global audio object
let isPlaying = false; // Track if audio is playing
let repeatAudio = true;
audio.loop = true;
let currentIndex = -1; // Initialize the index for the audio file list
let currentDirectory = null; // Initialize the current directory
let lastDirectory = null; // Store the last directory to keep track of where the audio is playing from
let lastFile = null; // Store the last file to continue playing when switching directories
let lastFilesList = []; // Store the list of files from the last directory

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

          // Add 'selected' class to the clicked list item and set the current directory
          li.classList.add("selected");
          currentDirectory = dir;
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
// and handles all audio playback and loading events
function loadAudioFiles(directory) {
  const isSwitchingBackToLastDirectory = directory === lastDirectory;

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
      const fileSelectElement = document.getElementById("File-Select");
      const audioListElement = document.getElementById("audioList");
      audioListElement.innerHTML = ""; // Clear the list first

      if (!Array.isArray(files) || files.length === 0) {
        console.error("No audio files found or the files array is empty.");
        fileSelectElement.classList.remove("files");
        const listItem = document.createElement("li");
        listItem.classList.add("Audio-Item.empty");
        listItem.textContent = "No audio files available in this directory.";
        audioListElement.appendChild(listItem);
        return; // Exit if no files found
      }

      // Populate new list of audio files
      fileSelectElement.classList.add("files");
      files.forEach((file, index) => {
        const listItem = document.createElement("li");
        listItem.classList.add("Audio-Item");
        listItem.setAttribute("id", `audio-file-${index}`);

        const nameTrack = document.createElement("div");
        nameTrack.classList.add("name-track");

        const audioName = document.createElement("span");
        audioName.classList.add("audio-name");
        audioName.textContent = file[0];

        const timeCode = document.createElement("span");
        timeCode.classList.add("time-code");
        timeCode.textContent = formatTime(file[1]);

        nameTrack.appendChild(audioName);
        listItem.appendChild(nameTrack);
        listItem.appendChild(timeCode);

        listItem.addEventListener("click", () => {
          // Deselect all list items
          const allLis = audioListElement.querySelectorAll("li");
          const allNames = audioListElement.querySelectorAll(".audio-name");
          allLis.forEach((item) => item.classList.remove("selected"));
          allNames.forEach((item) => item.classList.remove("long-name"));

          // Select the clicked list item
          listItem.classList.add("selected");
          const trackRect = nameTrack.getBoundingClientRect();
          const nameRect = audioName.getBoundingClientRect();

          // If the audio name is too long, add the long-name class for scrolling
          if (nameRect.width > trackRect.width) {
            audioName.classList.add("long-name");
          }

          // Update the last directory and file
          lastDirectory = directory;
          lastFile = file[0];
          lastFilesList = files; // Update the last files list with the current one
          currentIndex = index; // Set currentIndex to the selected track

          // Play the selected audio file
          playAudio(directory, file[0]);
        });

        audioListElement.appendChild(listItem);

        // Restore the last playing track if returning to the last directory
        if (isSwitchingBackToLastDirectory && lastFile === file[0]) {
          updateTrackIndex(index);
        }
      });

      // Store the list of files for future navigation only if it's the last playing directory
      if (isSwitchingBackToLastDirectory) {
        lastFilesList = files;
      }
    })
    .catch((error) => {
      console.error("Error fetching audio files:", error);
      document.getElementById("File-Select").classList.remove("files");
    });
}

// Function to play a specific audio file
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

// Function to update the track index and UI when navigating between tracks
function updateTrackIndex(index) {
  const audioListElement = document.getElementById("audioList");
  const allLis = audioListElement.querySelectorAll("li");
  const allNames = audioListElement.querySelectorAll(".audio-name");

  // Deselect all list items and remove 'long-name' class from names
  allLis.forEach((item) => item.classList.remove("selected"));
  allNames.forEach((item) => item.classList.remove("long-name"));

  // Check if the current dirrectory is the same as the last playing directory
  if (lastDirectory === currentDirectory) {
    // Track the current playing track and update the UI
    const currentItem = document.getElementById("audio-file-" + index);
    if (currentItem) {
      currentItem.classList.add("selected");

      const nameTrack = currentItem.querySelector(".name-track");
      const audioName = currentItem.querySelector(".audio-name");

      const trackRect = nameTrack.getBoundingClientRect();
      const nameRect = audioName.getBoundingClientRect();

      if (nameRect.width > trackRect.width) {
        audioName.classList.add("long-name");
      } else {
        audioName.classList.remove("long-name");
      }
    }
  }
}

// Function to update the playback time display
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

// Update the seek slider based on the current playback position
function updateSeekSlider() {
  const seekSlider = document.getElementById("seekSlider");
  seekSlider.value = (audio.currentTime / audio.duration) * 100 || 0; // Update or reset to 0 if NaN
}

// Update the play/pause button icon based on the current state
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

// Toggle play/pause of the audio
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

// Seek audio to a new position
function seekAudio() {
  const seekSlider = document.getElementById("seekSlider");
  if (audio.duration) {
    audio.currentTime = (seekSlider.value / 100) * audio.duration;
  }
}

// Toggle repeat mode on or off
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

// Setup global event listeners for audio controls
function setupAudioControls() {
  // Play/Pause button listeners
  document
    .getElementById("playPauseBtn")
    .addEventListener("click", togglePlayPause);
  document
    .getElementById("bigPlayPauseBtn")
    .addEventListener("click", togglePlayPause);

  // Seek slider listener
  document.getElementById("seekSlider").addEventListener("input", seekAudio);

  // Repeat button listener
  document.getElementById("repeatBtn").addEventListener("click", repeatToggle);

  // Time update listener for the audio
  audio.addEventListener("timeupdate", function () {
    const seekSlider = document.getElementById("seekSlider");
    const value = (audio.currentTime / audio.duration) * 100 || 0; // Calculate the current time percentage
    seekSlider.style.background = `linear-gradient(to right, #FEDE42 0%, #FEDE42 ${value}%, #ddd ${value}%, #ddd 100%)`;
    seekSlider.value = value;
    updatePlaybackTime();
  });

  // Prev button listener
  document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentIndex <= 0) {
      currentIndex = lastFilesList.length - 1; // Wrap around to the last track
    } else {
      currentIndex--;
    }
    lastFile = lastFilesList[currentIndex][0];
    playAudio(lastDirectory, lastFile);
    updateTrackIndex(currentIndex);
  });

  // Next button listener
  document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentIndex >= lastFilesList.length - 1) {
      currentIndex = 0; // Wrap around to the first track
    } else {
      currentIndex++;
    }
    lastFile = lastFilesList[currentIndex][0];
    playAudio(lastDirectory, lastFile);
    updateTrackIndex(currentIndex);
  });
}

setupAudioControls(); // Initialize audio controls once
