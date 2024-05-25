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
    .then((response) => response.json())
    .then((files) => {
      if (!Array.isArray(files)) {
        console.error("Unexpected response:", files);
        alert("Failed to load files: " + (files.error || "Unknown error"));
        return; // Exit if not an array
      }
      const audioListElement = document.getElementById("audioList");
      audioListElement.innerHTML = ""; // Clear the list first
      files.forEach((file) => {
        const listItem = document.createElement("li");
        listItem.classList.add("audio-item");

        const audioName = document.createElement("span");
        audioName.classList.add("audio-name");
        audioName.textContent = file[0];

        const timeCode = document.createElement("span");
        timeCode.classList.add("time-code");
        timeCode.textContent = `${file[1].toFixed(2)} seconds`;

        listItem.appendChild(audioName);
        listItem.appendChild(timeCode);
        listItem.addEventListener("click", () => {
          const allLis = audioListElement.querySelectorAll("li");
          allLis.forEach((item) => item.classList.remove("selected"));

          listItem.classList.add("selected");

          playAudio(directory, file[0]);
        });

        audioListElement.appendChild(listItem);
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

// Initialize the library list when the document is loaded
document.addEventListener("DOMContentLoaded", loadLibraries);
