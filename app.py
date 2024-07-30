from flask import Flask, send_from_directory, jsonify, render_template
from urllib.parse import unquote
from pydub import AudioSegment
import os

app = Flask(__name__)

# The base directory where your audio files are located
AUDIO_LIB = os.path.abspath('assets/audio_files')

@app.route('/')
def index():
    return render_template('main.html')

@app.route('/directories', methods=['GET'])
def list_directories():
    # List all directories in the AUDIO_LIB
    dirs = next(os.walk(AUDIO_LIB))[1]
    return jsonify(dirs)

@app.route('/files/<path:directory>', methods=['GET'])
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

    # List all audio files in the directory
    try:
        files = sorted(os.listdir(directory_path))
        audio_files = []
        for f in files:
            if f.endswith(('.mp3', '.wav', '.aac')):
                audio_path = os.path.join(directory_path, f)
                audio = AudioSegment.from_file(audio_path)
                duration = len(audio) / 1000  # duration in seconds
                audio_files.append((f, duration))
        print("Directory path:", directory_path)
        print("Audio files found:", audio_files)

        return jsonify(audio_files)
    except FileNotFoundError:
        return jsonify({"error": "Directory not found"}), 404

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

    # Send the audio file if it exists
    return send_from_directory(directory_path, filename, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
