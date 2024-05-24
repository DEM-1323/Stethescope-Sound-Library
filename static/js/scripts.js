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
        li.addEventListener("click", () => loadAudioFiles(dir));
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
        audioFile.textContent = file[0];
        audioFile.addEventListener("click", () =>
          playAudio(directory, file[0])
        );
        audioListElement.appendChild(audioFile);

        const timeCode = document.createElement("li");
        timeCode.textContent = `${file[1].toFixed(2)} seconds`;
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

// Initialize the library list when the document is loaded
document.addEventListener("DOMContentLoaded", loadLibraries);
