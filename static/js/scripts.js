/**
 * Stethoscope Sound Library - Main JavaScript Implementation
 *
 * This script handles all client-side functionality including:
 * - Audio library navigation and display
 * - Audio playback and controls
 * - UI state management
 * - Caching for performance optimization
 */

// Initialize application when DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Get script_name from body attribute for dynamic path handling
  scriptName = document.body.getAttribute("script_name") || "";
  loadLibraries(scriptName);
  setupAudioControls();
});

// Global State Management
// ----------------------
// Audio player instance and playback state
let audio = new Audio();
let isPlaying = false;
let repeatAudio = true;
audio.loop = true; // Default to looping enabled

// Track and directory management
let currentIndex = -1; // Current track index
let currentDirectory = null; // Active directory
let lastDirectory = null; // Previously played directory
let lastFile = null; // Last played file
let lastFilesList = []; // Cache of files in last directory
let fileCache = {}; // Directory content cache
let scriptName = ""; // Base path for API requests

/**
 * Fetches and displays available audio libraries/categories
 * Adds click handlers for directory selection and navigation
 * @param {string} scriptName - Base path for API requests
 */
function loadLibraries(scriptName) {
  fetch(`${scriptName}/directories`)
    .then((response) => response.json())
    .then((directories) => {
      const libraryListElement = document.getElementById("libraryList");
      libraryListElement.innerHTML = ""; // Clear existing entries

      directories.forEach((dir) => {
        const li = document.createElement("li");
        li.textContent = dir;

        // Setup directory selection handler
        li.addEventListener("click", () => {
          clearSelections(libraryListElement);
          li.classList.add("selected");
          currentDirectory = dir;
          loadAudioFiles(scriptName, dir);
        });

        libraryListElement.appendChild(li);
      });
    })
    .catch((error) => console.error("Error fetching directories:", error));
}

/**
 * Loads audio files for selected directory
 * Uses cached data when available to improve performance
 * @param {string} scriptName - Base path for API requests
 * @param {string} directory - Selected directory name
 */
function loadAudioFiles(scriptName, directory) {
  if (fileCache[directory]) {
    console.log("Using cached files for directory:", directory);
    populateFileList(directory, fileCache[directory]);
    return;
  }

  fetch(`${scriptName}/files/${encodeURIComponent(directory)}`)
    .then((response) => response.json())
    .then((files) => {
      fileCache[directory] = files; // Cache for future use
      populateFileList(directory, files);
    })
    .catch((error) => {
      console.error("Error fetching audio files:", error);
      document.getElementById("File-Select").classList.remove("files");
    });
}

/**
 * Populates the audio file list with fetched data
 * Handles empty directories and maintains selection state
 * @param {string} directory - Current directory name
 * @param {Array} files - Array of file data objects
 */
function populateFileList(directory, files) {
  const fileSelectElement = document.getElementById("File-Select");
  const audioListElement = document.getElementById("audioList");
  audioListElement.innerHTML = "";

  // Handle empty directory case
  if (!files.length) {
    fileSelectElement.classList.remove("files");
    const listItem = document.createElement("li");
    listItem.classList.add("Audio-Item.empty");
    listItem.textContent = "No audio files available in this directory.";
    audioListElement.appendChild(listItem);
    return;
  }

  // Create list items for each audio file
  fileSelectElement.classList.add("files");
  files.forEach((file, index) => {
    const listItem = createAudioListItem(file, index, directory, files);
    audioListElement.appendChild(listItem);
  });

  // Restore selection state if returning to previous directory
  if (directory === lastDirectory && lastFile) {
    updateTrackIndex(currentIndex);
  }
}

/**
 * Creates an individual audio file list item
 * Includes file metadata and click handlers
 * @param {Object} file - File data object
 * @param {number} index - Index in file list
 * @param {string} directory - Current directory
 * @param {Array} files - Complete file list for reference
 * @returns {HTMLElement} Configured list item
 */
function createAudioListItem(file, index, directory, files) {
  const listItem = document.createElement("li");
  listItem.classList.add("Audio-Item");
  listItem.setAttribute("id", `audio-file-${index}`);

  // Create name container and elements
  const nameTrack = document.createElement("div");
  nameTrack.classList.add("name-track");

  const audioName = document.createElement("span");
  audioName.classList.add("audio-name");
  audioName.textContent = file[0].split(".")[0];

  const timeCode = document.createElement("span");
  timeCode.classList.add("time-code");
  timeCode.textContent = formatTime(file[1]);

  // Assemble elements
  nameTrack.appendChild(audioName);
  listItem.appendChild(nameTrack);
  listItem.appendChild(timeCode);

  // Configure click handler for playback
  listItem.addEventListener("click", () => {
    clearSelections(audioListElement);
    listItem.classList.add("selected");
    handleLongNameScroll(audioName, nameTrack);

    // Update state tracking
    lastDirectory = directory;
    lastFile = file[0];
    lastFilesList = files;
    currentIndex = index;

    playAudio(scriptName, directory, file[0]);
  });

  return listItem;
}

/**
 * Handles audio playback of selected file
 * Updates UI and manages playback state
 * @param {string} scriptName - Base path for API requests
 * @param {string} directory - Current directory
 * @param {string} file - Selected filename
 */
function playAudio(scriptName, directory, file) {
  const safeDirectory = encodeURIComponent(directory);
  const safeFile = encodeURIComponent(file);

  // Update now playing display
  const nowPlaying = document.getElementById("nowPlaying");
  nowPlaying.innerHTML = file.split(".")[0];
  handleLongNameScroll(nowPlaying, document.getElementById("audioTitle"));

  // Configure and start playback
  audio.src = `${scriptName}/audio/${safeDirectory}/${safeFile}`;
  audio.play();
  isPlaying = true;
  updatePlayPauseButton();
}

/**
 * Updates track selection in UI
 * Handles visual feedback for current track
 * @param {number} index - Index of current track
 */
function updateTrackIndex(index) {
  const audioListElement = document.getElementById("audioList");
  clearSelections(audioListElement);

  if (lastDirectory === currentDirectory) {
    const currentItem = document.getElementById(`audio-file-${index}`);
    if (currentItem) {
      currentItem.classList.add("selected");
      handleLongNameScroll(
        currentItem.querySelector(".audio-name"),
        currentItem.querySelector(".name-track")
      );
    }
  }
}

/**
 * Clears selection state from all items
 * Resets long name scrolling
 * @param {HTMLElement} element - Container element
 */
function clearSelections(element) {
  const allLis = element.querySelectorAll("li");
  const allNames = element.querySelectorAll(".audio-name");
  allLis.forEach((item) => item.classList.remove("selected"));
  allNames.forEach((item) => item.classList.remove("long-name"));
}

/**
 * Manages scrolling for long text content
 * Adds scrolling animation for overflow content
 * @param {HTMLElement} nameElement - Text container element
 * @param {HTMLElement} trackElement - Parent container
 */
function handleLongNameScroll(nameElement, trackElement) {
  const trackRect = trackElement.getBoundingClientRect();
  const nameRect = nameElement.getBoundingClientRect();
  if (nameRect.width > trackRect.width) {
    nameElement.classList.add("long-name");
  } else {
    nameElement.classList.remove("long-name");
  }
}

/**
 * Formats time duration for display
 * Converts seconds to MM:SS format
 * @param {number} timeInSeconds - Duration in seconds
 * @returns {string} Formatted time string
 */
function formatTime(timeInSeconds) {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
}

/**
 * Initializes audio player controls
 * Sets up event listeners for playback interface
 */
function setupAudioControls() {
  // Configure main playback controls
  document
    .getElementById("playPauseBtn")
    .addEventListener("click", togglePlayPause);
  document
    .getElementById("bigPlayPauseBtn")
    .addEventListener("click", togglePlayPause);
  document.getElementById("seekSlider").addEventListener("input", seekAudio);
  document.getElementById("repeatBtn").addEventListener("click", repeatToggle);

  // Setup progress tracking
  audio.addEventListener("timeupdate", () => {
    const seekSlider = document.getElementById("seekSlider");
    const value = (audio.currentTime / audio.duration) * 100 || 0;
    seekSlider.style.background = `linear-gradient(to right, #FEDE42 0%, #FEDE42 ${value}%, #ddd ${value}%, #ddd 100%)`;
    seekSlider.value = value;
    updatePlaybackTime();
  });

  // Configure navigation controls
  setupNavigationControls();
}

/**
 * Sets up previous/next track navigation
 * Handles playlist wraparound
 */
function setupNavigationControls() {
  document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentIndex <= 0) {
      currentIndex = lastFilesList.length - 1;
    } else {
      currentIndex--;
    }
    playAudio(scriptName, lastDirectory, lastFilesList[currentIndex][0]);
    updateTrackIndex(currentIndex);
  });

  document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentIndex >= lastFilesList.length - 1) {
      currentIndex = 0;
    } else {
      currentIndex++;
    }
    playAudio(scriptName, lastDirectory, lastFilesList[currentIndex][0]);
    updateTrackIndex(currentIndex);
  });
}

/**
 * Updates playback time display
 * Shows current position and total duration
 */
function updatePlaybackTime() {
  const playbackTimeElement = document.querySelector(".playback-time");
  playbackTimeElement.textContent = `${formatTime(
    audio.currentTime
  )} / ${formatTime(audio.duration)}`;
}

/**
 * Toggles play/pause state
 * Updates UI to reflect current state
 */
function togglePlayPause() {
  if (audio.paused) {
    audio.play();
    isPlaying = true;
  } else {
    audio.pause();
    isPlaying = false;
  }
  updatePlayPauseButton();
}

/**
 * Updates play/pause button appearance
 * Reflects current playback state
 */
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

/**
 * Handles seeking within audio track
 * Updates playback position based on slider
 */
function seekAudio() {
  const seekSlider = document.getElementById("seekSlider");
  audio.currentTime = (seekSlider.value / 100) * audio.duration;
}

/**
 * Toggles repeat mode
 * Updates UI to reflect current state
 */
function repeatToggle() {
  repeatAudio = !repeatAudio;
  audio.loop = repeatAudio;
  document.getElementById("repeatBtn").style.opacity = repeatAudio
    ? "1"
    : "0.5";
}
