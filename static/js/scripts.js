// This function fetches the list of directories from the Flask server
function loadLibraries() {
  fetch("/directories")
    .then((response) => response.json())
    .then((directories) => {
      const libraryListElement = document.getElementById("libraryList");
      libraryListElement.innerHTML = ""; // Clear the list first

      directories.forEach((dir) => {
        const li = document.createElement("li");
        li.textContent = dir;
        li.addEventListener("click", () => {
          loadAudioFiles(dir);
          highlightLibrary(li);
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
    .then((response) => response.json())
    .then((files) => {
      if (!Array.isArray(files)) {
        console.error("Unexpected response:", files);
        alert("Failed to load files: " + (files.error || "Unknown error"));
        return; // Exit if not an array
      }

      const audioListElement = document.getElementById("audioList");
      const timeCodesElement = document.getElementById("timeCodes");
      audioListElement.innerHTML = ""; // Clear the list first
      timeCodesElement.innerHTML = "";

      files.forEach((file) => {
        const audioFile = document.createElement("li");
        const timeCode = document.createElement("li");
        audioFile.textContent = file[0];
        timeCode.textContent = `${file[1].toFixed(2)} seconds`;
        audioFile.addEventListener("click", () => {
          playAudio(directory, file[0]);
          highlightAudio(audioFile, timeCode);
        });
        audioListElement.appendChild(audioFile);
        timeCodesElement.appendChild(timeCode);
      });
    })
    .catch((error) => {
      console.error("Error fetching audio files:", error);
    });
}

// This function plays the selected audio file
function playAudio(directory, file) {
  const audioPlayer = document.getElementById("audioPlayer");
  const safeDirectory = encodeURIComponent(directory); // Sanitize directory
  const safeFile = encodeURIComponent(file); // Sanitize file name
  audioPlayer.src = `/audio/${safeDirectory}/${safeFile}`;
  audioPlayer.play();
}

let lastSelectedLib = null; // This will store the last clicked library list item

function highlightLibrary(listItem) {
  // Reset the last selected item if it exists
  if (lastSelectedLib && lastSelectedLib !== listItem) {
    lastSelectedLib.style.color = ""; // Revert to original color
    lastSelectedLib.style.backgroundColor = ""; // Revert to original background color
    lastSelectedLib.style.borderBottom = "";
    lastSelectedLib.style.boxShadow = ""; // Revert to original box shadow
  }

  // Apply new style to the current item
  listItem.style.color = "#132245";
  listItem.style.backgroundColor = "#FEDE42";
  listItem.style.borderBottom = "solid #005A8B";
  //listItem.style.boxShadow = "inset 0px -1px 6px 1px rgba(0, 0, 0, 0.2)";

  // Update lastSelectedLib to be the current item
  lastSelectedLib = listItem;
}

let lastSelectedAudio = null;

function highlightAudio(audioFile, timeCode) {
  if (
    lastSelectedAudio &&
    lastSelectedAudio.audioFile !== audioFile &&
    lastSelectedAudio.timeCode !== timeCode
  ) {
    lastSelectedAudio.audioFile.style.color = ""; // Revert to original color for audioFile
    lastSelectedAudio.audioFile.style.backgroundColor = ""; // Revert to original background color for audioFile
    lastSelectedAudio.audioFile.style.borderBottom = ""; // Revert to original border
    lastSelectedAudio.timeCode.style.color = ""; // Revert to original color for timeCode
    lastSelectedAudio.timeCode.style.backgroundColor = ""; // Revert to original background color for timeCode
    lastSelectedAudio.timeCode.style.borderBottom = "";
  }
  // Apply new style to the current items
  audioFile.style.color = "#132245";
  audioFile.style.backgroundColor = "#FEDE42";
  audioFile.style.borderBottom = "solid #005A8B";
  timeCode.style.color = "#132245";
  timeCode.style.backgroundColor = "#FEDE42";
  timeCode.style.borderBottom = "solid #005A8B";

  // Update lastSelectedAudio to be the current items
  lastSelectedAudio = { audioFile, timeCode };
}

// Initialize the library list when the document is loaded
document.addEventListener("DOMContentLoaded", loadLibraries);
