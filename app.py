from flask import Flask, send_from_directory, jsonify, render_template
from werkzeug.utils import secure_filename
import os

app = Flask(__name__)

# The base directory where your audio files are located
AUDIO_LIB = 'assets/audio_files'


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
    # Make sure it's safe to join the directory path
    directory = secure_filename(directory)
    directory_path = os.path.join(AUDIO_LIB, directory)
    
    # Security check to ensure the directory is within the allowed path
    if not os.path.isdir(directory_path):
        return jsonify({"error": "Directory not found"}), 404

    # List all audio files in the directory
    try:
        files = os.listdir(directory_path)
        audio_files = [f for f in files if f.endswith(('.mp3', '.wav', '.aac'))]
        return jsonify(audio_files)
    except FileNotFoundError:
        return jsonify({"error": "Directory not found"}), 404


@app.route('/audio/<path:directory>/<filename>', methods=['GET'])
def play_audio(directory, filename):
    directory = secure_filename(directory)
    filename = secure_filename(filename)
    directory_path = os.path.join(AUDIO_LIB, directory)

    if not os.path.isdir(directory_path):
        return jsonify({"error": "Directory not found"}), 404

    file_path = os.path.join(directory_path, filename)
    if not os.path.isfile(file_path):
        return jsonify({"error": "File not found"}), 404

    # Send the audio file if it exists
    return send_from_directory(directory_path, filename, as_attachment=True)


if __name__ == '__main__':
    app.run(debug=True)
