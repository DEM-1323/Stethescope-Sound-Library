from flask import Flask, send_from_directory, jsonify, render_template
from urllib.parse import unquote
import os
from flask_caching import Cache
from pydub import AudioSegment
import mutagen

app = Flask(__name__)

# The base directory where your audio files are located
AUDIO_LIB = os.path.abspath('assets/audio_files')

# Force HTTPS
app.config['PREFERRED_URL_SCHEME'] = 'https'

# Configure Flask-Caching
app.config['CACHE_TYPE'] = 'simple'
app.config['CACHE_DEFAULT_TIMEOUT'] = 300  # Cache for 5 minutes
cache = Cache(app)

@app.route('/')
def home():
    return 'index.html'

@app.route('/ccerapp')
def stethescope_sound_library():
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

# Utility function to get the duration of the audio file using mutagen and fallback to pydub
def get_audio_duration(file_path):
    """
    Get the duration of the audio file using mutagen.
    Falls back to pydub for formats that mutagen cannot handle (like some AAC files).
    """
    try:
        # Attempt to get duration using mutagen
        audio = mutagen.File(file_path)
        if audio and hasattr(audio.info, 'length'):
            if audio.info.length > 0:
                return audio.info.length  # duration in seconds
            else:
                # Fall back to pydub if mutagen fails or returns 0 for certain formats
                return get_duration_with_pydub(file_path)
    except Exception as e:
        print(f"Error getting audio duration for {file_path} using mutagen: {e}")
        return get_duration_with_pydub(file_path)

def get_duration_with_pydub(file_path):
    """
    Fallback to pydub to get the duration for formats not supported by mutagen.
    """
    try:
        audio = AudioSegment.from_file(file_path)
        return len(audio) / 1000  # pydub returns duration in milliseconds
    except Exception as e:
        print(f"Error getting audio duration for {file_path} using pydub: {e}")
        return 0  # Return 0 if both mutagen and pydub fail

if __name__ == '__main__':
    from waitress import serve
    serve(app, host='0.0.0.0', port=8000)

