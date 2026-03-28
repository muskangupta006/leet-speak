from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from test_voices import text_to_speech
import base64
import os

from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).parent / '.env')
print("API KEY:", os.getenv("ELEVEN_API_KEY"))

app = Flask(__name__)
CORS(app)

@app.route('/text-to-speech', methods=['POST'])
def tts():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'No text provided'}), 400

    output_file = 'tts_output.mp3'
    result = text_to_speech(text, output_file=output_file)

    if result:
        with open(output_file, 'rb') as f:
            audio_b64 = base64.b64encode(f.read()).decode('utf-8')
        return jsonify({'audio': audio_b64})
    else:
        return jsonify({'error': 'TTS generation failed'}), 500

if __name__ == '__main__':
    app.run(port=5002, debug=True)