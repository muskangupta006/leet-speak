from dotenv import load_dotenv
import os
import requests

# Load environment variables from .env
load_dotenv()

# Get API key from .env
API_KEY = os.getenv("ELEVEN_API_KEY")

def text_to_speech(text, output_file="output.mp3", voice_id="hzLyDn3IrvrdH83BdqUu"):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    headers = {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    
    data = {
        "text": text,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }

    response = requests.post(url, json=data, headers=headers)

    if response.status_code == 200:
        with open(output_file, "wb") as f:
            f.write(response.content)
        print(f"✅ Audio saved as {output_file}")
        return output_file
    else:
        print(f"❌ Error {response.status_code}: {response.text}")
        return None

# Optional: interactive test
if __name__ == "__main__":
    user_text = input("Enter text to convert to speech: ")
    text_to_speech(user_text)