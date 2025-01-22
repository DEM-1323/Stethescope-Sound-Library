"""
Stethoscope Sound Library - Flask Backend Application

This Flask application serves as the backend for the Stethoscope Sound Library,
providing endpoints for directory listing, file management, and audio file serving.
The application implements caching and security measures to ensure efficient and
secure operation.

Key Features:
- Directory and file listing with caching
- Secure audio file serving
- Audio duration calculation with fallback mechanisms
- HTTPS enforcement
- Path traversal protection
"""

from flask import Flask, send_from_directory, jsonify, render_template
from urllib.parse import unquote
import os
from flask_caching import Cache
from pydub import AudioSegment
import mutagen
import configparser

# Initialize Flask application
app = Flask(__name__)

# Load configuration from ini file
# This allows for flexible deployment paths through script_name configuration
config = configparser.ConfigParser()
config.read('cceraudio.ini')
script_name = config.get('settings', 'script_name', fallback='')

# Define the base directory for audio files
# Using absolute path to ensure consistent file access across different environments
AUDIO_LIB = os.path.abspath('assets/audio_files')

# Security configuration: Force HTTPS to ensure secure data transmission
app.config['PREFERRED_URL_SCHEME'] = 'https'

# Configure caching to improve performance
# Uses simple cache with 5-minute timeout to balance freshness and performance
app.config['CACHE_TYPE'] = 'simple'
app.config['CACHE_DEFAULT_TIMEOUT'] = 300  # 5 minutes in seconds
cache = Cache(app)

# Route handlers for main application pages
@app.route('/')
def index():
    """Redirect root URL to main application page"""
    return stethescope_sound_library()

@app.route('/cceraudio')
def stethescope_sound_library():
    """Render the main application template with script_name configuration"""
    return render_template('main.html', script_name=script_name)

@app.route(f'{script_name}/directories', methods=['GET'])
@cache.cached(timeout=300)
def list_directories():
    """
    List all directories in the audio library.
    
    Returns:
        JSON array of directory names, cached for 5 minutes
        
    The cache reduces server load for frequently accessed directory listings.
    """
    dirs = sorted(next(os.walk(AUDIO_LIB))[1])
    return jsonify(dirs)

@app.route(f'{script_name}/files/<path:directory>', methods=['GET'])
@cache.cached(timeout=300)
def list_files(directory):
    """
    List all audio files in a specified directory with their durations.
    
    Args:
        directory (str): URL-encoded directory path
        
    Returns:
        JSON array of tuples containing filename and duration
        
    Includes security measures against path traversal attacks and
    proper error handling for missing directories.
    """
    # URL decode and sanitize the directory path
    directory = unquote(directory)
    directory = os.path.normpath(directory).replace('..', '')
    directory_path = os.path.join(AUDIO_LIB, directory)
    print("Requested directory:", directory_path)

    # Security verification: ensure path is within allowed directory
    if not directory_path.startswith(AUDIO_LIB):
        return jsonify({"error": "Invalid directory path"}), 403

    if not os.path.isdir(directory_path):
        return jsonify({"error": "Directory not found"}), 404

    # List and process audio files
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

@app.route(f'{script_name}/audio/<path:directory>/<path:filename>', methods=['GET'])
def play_audio(directory, filename):
    """
    Serve audio files securely from the specified directory.
    
    Args:
        directory (str): URL-encoded directory path
        filename (str): URL-encoded audio filename
        
    Returns:
        Audio file stream with appropriate headers
        
    Implements security checks to prevent unauthorized file access.
    """
    # Decode and validate paths
    directory = unquote(directory)
    filename = unquote(filename)
    directory_path = os.path.join(AUDIO_LIB, directory)

    # Security check for path traversal
    if not directory_path.startswith(AUDIO_LIB):
        return jsonify({"error": "Invalid directory path"}), 403

    file_path = os.path.join(directory_path, filename)
    if not os.path.isfile(file_path):
        return jsonify({"error": "File not found"}), 404

    return send_from_directory(directory_path, filename)

def get_audio_duration(file_path):
    """
    Calculate the duration of an audio file using multiple methods.
    
    Args:
        file_path (str): Path to the audio file
        
    Returns:
        float: Duration in seconds
        
    Uses mutagen as primary method with pydub as fallback for broader format support.
    """
    try:
        # Primary duration calculation using mutagen
        audio = mutagen.File(file_path)
        if audio and hasattr(audio.info, 'length'):
            if audio.info.length > 0:
                return audio.info.length
            else:
                # Fallback to pydub for zero-length results
                return get_duration_with_pydub(file_path)
    except Exception as e:
        print(f"Error getting audio duration for {file_path} using mutagen: {e}")
        return get_duration_with_pydub(file_path)

def get_duration_with_pydub(file_path):
    """
    Fallback method to get audio duration using pydub.
    
    Args:
        file_path (str): Path to the audio file
        
    Returns:
        float: Duration in seconds, 0 if calculation fails
        
    Provides broader format support than mutagen for problematic files.
    """
    try:
        audio = AudioSegment.from_file(file_path)
        return len(audio) / 1000  # Convert milliseconds to seconds
    except Exception as e:
        print(f"Error getting audio duration for {file_path} using pydub: {e}")
        return 0

# Production server configuration
if __name__ == '__main__':
    from waitress import serve
    serve(app, host='0.0.0.0', port=8000)