from flask import Flask, send_from_directory, jsonify, render_template
from urllib.parse import unquote
import os
from flask_caching import Cache
import mutagen

app = Flask(__name__)

# The base directory where your audio files are located
AUDIO_LIB = os.path.abspath('assets/audio_files')

# Configure Flask-Caching
app.config['CACHE_TYPE'] = 'simple'
app.config['CACHE_DEFAULT_TIMEOUT'] = 300  # Cache for 5 minutes
cache = Cache(app)

@app.route('/')
def index():
    return render_template('main.html')

# Caching directory listing for faster performance
@app.route('/directories', methods=['GET'])
@cache.cached(timeout=300)  # Cache directory list for 5 minutes
def list_directories():
    # List all directories in the AUDIO_LIB
    dirs = sorted(next(os.walk(AUDIO_LIB))[1])
    return jsonify(dirs)

# Caching file listing in each directory for faster performance
@app.route('/files/<path:directory>', methods=['GET'])
@cache.cached(timeout=300)  # Cache file list for 5 minutes
def list_files(directory):
    # Decode the URL-encoded directory path
    directory = unquote(directory)
    directory = os.path.normpath(directory).replace('..', '')
    directory_path = os.path.join(AUDIO_LIB, directory)
    print("Requested directory:", directory_path)

    # Security check to ensure the directory is within the allowed path
    if not directory_path.startswith(AUDIO_LIB):
        return jsonify({"error": "Invalid directory path"}), 403

    if not os.path.isdir(directory_path):
        return jsonify({"error": "Directory not found"}), 404

    # List all audio files in the directory and get duration
    try:
        files = sorted(os.listdir(directory_path))
        audio_files = []
        for f in files:
            if f.endswith(('.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a')):
                audio_path = os.path.join(directory_path, f)
                duration = get_audio_duration(audio_path)
                audio_files.append((f, duration))
        print("Audio files found:", audio_files)

        return jsonify(audio_files)
    except FileNotFoundError:
        return jsonify({"error": "Directory not found"}), 404

# Function to serve audio files from the directory
@app.route('/audio/<path:directory>/<path:filename>', methods=['GET'])
def play_audio(directory, filename):
    # Decode the URL-encoded paths
    directory = unquote(directory)
    filename = unquote(filename)
    directory_path = os.path.join(AUDIO_LIB, directory)

    if not directory_path.startswith(AUDIO_LIB):
        return jsonify({"error": "Invalid directory path"}), 403

    file_path = os.path.join(directory_path, filename)
    if not os.path.isfile(file_path):
        return jsonify({"error": "File not found"}), 404

    # Serve the audio file directly as a static file
    return send_from_directory(directory_path, filename)

# Utility function to get the duration of the audio file
def get_audio_duration(file_path):
    """
    Get the duration of the audio file using mutagen.
    Supports multiple audio formats such as MP3, AAC, FLAC, WAV, OGG, etc.
    """
    try:
        # Automatically detects the audio format and retrieves metadata
        audio = mutagen.File(file_path)
        if audio and hasattr(audio.info, 'length'):
            return audio.info.length  # duration in seconds
        else:
            return 0  # Default to 0 if duration cannot be determined
    except Exception as e:
        print(f"Error getting audio duration for {file_path}: {e}")
        return 0

if __name__ == '__main__':
    app.run(debug=True)
