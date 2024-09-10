document.addEventListener("DOMContentLoaded", function () {
  loadLibraries(); // Load libraries when the document is ready
  setupAudioControls(); // Set up audio controls (play, pause, prev, next)
});

// Global variables
let audio = new Audio(); // Create a global audio object to control audio playback
let isPlaying = false; // Boolean to track if audio is currently playing
let repeatAudio = true; // Boolean to track repeat state
audio.loop = true; // Set audio to loop by default
let currentIndex = -1; // Track the current index of the audio file being played
let currentDirectory = null; // Track the current directory being accessed
let lastDirectory = null; // Track the last directory that played audio
let lastFile = null; // Track the last file being played
let lastFilesList = []; // Store the list of files in the last played directory
let fileCache = {}; // Cache object to store previously fetched audio files by directory

/**
 * Fetches the list of directories from the server and populates them into
 * the library list in the HTML. Adds click event listeners to each directory
 * that will trigger loading of audio files from the selected directory.
 */
function loadLibraries() {
  fetch("/directories")
    .then((response) => response.json())
    .then((directories) => {
      const libraryListElement = document.getElementById("libraryList");
      libraryListElement.innerHTML = ""; // Clear the list before adding new directories

      // Iterate through the directories received from the server
      directories.forEach((dir) => {
        const li = document.createElement("li");
        li.textContent = dir; // Set the directory name as the list item text
        li.addEventListener("click", () => {
          clearSelections(libraryListElement); // Deselect all previously selected directories
          li.classList.add("selected"); // Highlight the clicked directory
          currentDirectory = dir; // Set the clicked directory as the current directory
          loadAudioFiles(dir); // Load the audio files in the selected directory
        });
        libraryListElement.appendChild(li); // Append the directory to the list
      });
    })
    .catch((error) => console.error("Error fetching directories:", error));
}

/**
 * Fetches the list of audio files from the selected directory. If the directory
 * has been previously loaded, it uses cached data instead of fetching it again.
 * This reduces redundant fetch requests and speeds up the user experience.
 */
function loadAudioFiles(directory) {
  if (fileCache[directory]) {
    // If the directory is cached, load files from the cache
    console.log("Using cached files for directory:", directory);
    populateFileList(directory, fileCache[directory]);
  } else {
    // If not cached, fetch the files from the server
    fetch(`/files/${encodeURIComponent(directory)}`)
      .then((response) => response.json())
      .then((files) => {
        fileCache[directory] = files; // Cache the fetched files for future use
        populateFileList(directory, files); // Populate the file list with the fetched data
      })
      .catch((error) => {
        console.error("Error fetching audio files:", error);
        document.getElementById("File-Select").classList.remove("files");
      });
  }
}

/**
 * Populates the audio file list in the UI with the audio files fetched from the server
 * or cache. Each file in the directory gets a clickable list item that plays the
 * corresponding audio file when clicked.
 */
function populateFileList(directory, files) {
  const fileSelectElement = document.getElementById("File-Select");
  const audioListElement = document.getElementById("audioList");
  audioListElement.innerHTML = ""; // Clear the audio list before adding new files

  if (!files.length) {
    // If there are no files, display a message
    fileSelectElement.classList.remove("files");
    const listItem = document.createElement("li");
    listItem.classList.add("Audio-Item.empty");
    listItem.textContent = "No audio files available in this directory.";
    audioListElement.appendChild(listItem);
    return;
  }

  fileSelectElement.classList.add("files"); // Indicate files are being displayed
  files.forEach((file, index) => {
    const listItem = document.createElement("li");
    listItem.classList.add("Audio-Item"); // Add class to list item for styling
    listItem.setAttribute("id", `audio-file-${index}`); // Set unique ID based on index

    const nameTrack = document.createElement("div");
    nameTrack.classList.add("name-track");

    const audioName = document.createElement("span");
    audioName.classList.add("audio-name");

    audioName.textContent = file[0].split(".")[0]; // Set the audio file name as text

    const timeCode = document.createElement("span");
    timeCode.classList.add("time-code");
    timeCode.textContent = formatTime(file[1]); // Display the formatted duration of the file

    nameTrack.appendChild(audioName); // Append the name to the name track
    listItem.appendChild(nameTrack);
    listItem.appendChild(timeCode);

    // Add click listener to each audio file list item to play the file
    listItem.addEventListener("click", () => {
      clearSelections(audioListElement); // Clear the selected class from all items
      listItem.classList.add("selected"); // Add selected class to the clicked item

      handleLongNameScroll(audioName, nameTrack); // Handle scrolling for long file names

      // Update global tracking variables for the selected file and directory
      lastDirectory = directory;
      lastFile = file[0];
      lastFilesList = files;
      currentIndex = index;

      playAudio(directory, file[0]); // Play the selected audio file
    });

    audioListElement.appendChild(listItem); // Add the list item to the audio list

    // If returning to the last played directory, update the UI to reflect the currently playing track
    if (directory === lastDirectory && lastFile === file[0]) {
      updateTrackIndex(index);
    }
  });
}

/**
 * Plays the selected audio file. The file is fetched from the server and played
 * using the global `audio` object. The now playing UI is also updated.
 */
function playAudio(directory, file) {
  const safeDirectory = encodeURIComponent(directory); // URL-safe encoding
  const safeFile = encodeURIComponent(file); // URL-safe encoding

  const nowPlaying = document.getElementById("nowPlaying");
  nowPlaying.innerHTML = file.split(".")[0]; // Update the now playing text in the UI

  handleLongNameScroll(nowPlaying, document.getElementById("audioTitle")); // Handle scrolling for long names

  // Set the audio source and play the file
  audio.src = `/audio/${safeDirectory}/${safeFile}`;
  audio.play();
  isPlaying = true; // Mark audio as playing
  updatePlayPauseButton(); // Update the play/pause button state
}

/**
 * Updates the track index in the UI when navigating between tracks.
 * Ensures that the correct file is highlighted and displayed as selected.
 */
function updateTrackIndex(index) {
  const audioListElement = document.getElementById("audioList");
  clearSelections(audioListElement); // Deselect all items before selecting the current one

  // If the last directory matches the current one, update the selected item
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
 * Clears all selections by removing the 'selected' class from each list item
 * and resets the 'long-name' class for handling long name scrolling.
 */
function clearSelections(element) {
  const allLis = element.querySelectorAll("li");
  const allNames = element.querySelectorAll(".audio-name");
  allLis.forEach((item) => item.classList.remove("selected"));
  allNames.forEach((item) => item.classList.remove("long-name"));
}

/**
 * Handles the case when a file or track name is too long to fit in the display.
 * Adds a class for scrolling the name if it exceeds the available space.
 */
function handleLongNameScroll(nameElement, trackElement) {
  const trackRect = trackElement.getBoundingClientRect();
  const nameRect = nameElement.getBoundingClientRect();
  if (nameRect.width > trackRect.width) {
    nameElement.classList.add("long-name"); // Enable scrolling for long names
  } else {
    nameElement.classList.remove("long-name"); // Remove scrolling if it fits
  }
}

/**
 * Formats a duration in seconds into a minutes:seconds format.
 * This is used to display the duration of audio files in the list.
 */
function formatTime(timeInSeconds) {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
}

// Setup global event listeners for audio controls (play, pause, next, prev)
function setupAudioControls() {
  document
    .getElementById("playPauseBtn")
    .addEventListener("click", togglePlayPause);
  document
    .getElementById("bigPlayPauseBtn")
    .addEventListener("click", togglePlayPause);

  // Add seek slider listener to allow seeking through the audio
  document.getElementById("seekSlider").addEventListener("input", seekAudio);

  // Add repeat button listener to toggle repeat mode
  document.getElementById("repeatBtn").addEventListener("click", repeatToggle);

  // Update seek slider and playback time while the audio is playing
  audio.addEventListener("timeupdate", () => {
    const seekSlider = document.getElementById("seekSlider");
    const value = (audio.currentTime / audio.duration) * 100 || 0;
    seekSlider.style.background = `linear-gradient(to right, #FEDE42 0%, #FEDE42 ${value}%, #ddd ${value}%, #ddd 100%)`;
    seekSlider.value = value;
    updatePlaybackTime(); // Update the playback time display
  });

  // Previous and Next button listeners for navigating through the playlist
  document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentIndex <= 0) {
      currentIndex = lastFilesList.length - 1;
    } else {
      currentIndex--;
    }
    playAudio(lastDirectory, lastFilesList[currentIndex][0]); // Play previous track
    updateTrackIndex(currentIndex); // Update UI to reflect the selected track
  });

  document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentIndex >= lastFilesList.length - 1) {
      currentIndex = 0;
    } else {
      currentIndex++;
    }
    playAudio(lastDirectory, lastFilesList[currentIndex][0]); // Play next track
    updateTrackIndex(currentIndex); // Update UI to reflect the selected track
  });
}

// Update playback time display
function updatePlaybackTime() {
  const playbackTimeElement = document.querySelector(".playback-time");
  playbackTimeElement.textContent = `${formatTime(
    audio.currentTime
  )} / ${formatTime(audio.duration)}`; // Show current time and total duration
}

// Toggle play/pause state for the audio
function togglePlayPause() {
  if (audio.paused) {
    audio.play(); // Play the audio if paused
    isPlaying = true;
  } else {
    audio.pause(); // Pause the audio if playing
    isPlaying = false;
  }
  updatePlayPauseButton(); // Update the play/pause button UI
}

// Update the play/pause button state in the UI
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

// Seek audio to a new position based on slider input
function seekAudio() {
  const seekSlider = document.getElementById("seekSlider");
  audio.currentTime = (seekSlider.value / 100) * audio.duration; // Adjust current time of the audio
}

// Toggle repeat mode for the audio
function repeatToggle() {
  repeatAudio = !repeatAudio;
  audio.loop = repeatAudio; // Enable or disable looping based on repeat state
  document.getElementById("repeatBtn").style.opacity = repeatAudio
    ? "1"
    : "0.5"; // Update repeat button opacity to reflect the state
}
