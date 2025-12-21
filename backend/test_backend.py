import requests
import os

# We hardcode the URL because we want to test the specific deployed endpoint
url = "https://yadaumur00--serverless-tts-generate-speech.modal.run"

print(f"Testing URL: {url}")

try:
    # Test POST (as required)
    response = requests.post(url, json={"text": "Test"}, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
