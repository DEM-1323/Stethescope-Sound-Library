// This function fetches the list of directories from the Flask server
function loadLibraries() {
    fetch('/directories')
      .then(response => response.json())
      .then(directories => {
        const libraryListElement = document.getElementById('libraryList');
        libraryListElement.innerHTML = ''; // Clear the list first
  
        directories.forEach(dir => {
          const li = document.createElement('li');
          li.textContent = dir;
          li.addEventListener('click', () => loadAudioFiles(dir));
          libraryListElement.appendChild(li);
        });
      })
      .catch(error => {
        console.error('Error fetching directories:', error);
      });
  }
  
  // This function fetches the list of audio files from the selected directory
  function loadAudioFiles(directory) {
    fetch(`/files/${encodeURIComponent(directory)}`)
      .then(response => response.json())
      .then(files => {
        const audioListElement = document.getElementById('audioList');
        audioListElement.innerHTML = ''; // Clear the list first
  
        files.forEach(file => {
          const li = document.createElement('li');
          li.textContent = file;
          li.addEventListener('click', () => playAudio(directory, file));
          audioListElement.appendChild(li);
        });
      })
      .catch(error => {
        console.error('Error fetching audio files:', error);
      });
  }
  
  // This function plays the selected audio file
  function playAudio(directory, file) {
    const audioPlayer = document.getElementById('audioPlayer');
    const safeDirectory = encodeURIComponent(directory); // Sanitize directory
    const safeFile = encodeURIComponent(file); // Sanitize file name
    audioPlayer.src = `/audio/${safeDirectory}/${safeFile}`;
    audioPlayer.play();
  }
  
  // Initialize the library list when the document is loaded
  document.addEventListener('DOMContentLoaded', loadLibraries);
  