import os
import io
import uuid
import boto3
import modal
import asyncio
import edge_tts
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Define the Modal image with necessary dependencies
image = modal.Image.debian_slim().pip_install(
    "edge-tts",
    "boto3",
    "fastapi"
)

app = modal.App("serverless-tts")

# ... (secrets) ...
secrets = modal.Secret.from_dict({
    "R2_BUCKET_NAME": "free-tts",
    "R2_ACCESS_KEY_ID": "c048cdfa4ebc41ac53911e429a600493",
    "R2_SECRET_ACCESS_KEY": "2ae75386f0d96fcb99ad0a9cdc2367c044ce64f8c5a0c751735d5290a45abbd9",
    "R2_ACCOUNT_ID": "102bc73995774de56f8a0434466b0929"
})

web_app = FastAPI()

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    text: str
    voice: str = "en-US-AriaNeural" # Default voice
    rate: str = "+0%"
    pitch: str = "+0Hz"
    volume: str = "+0%"

@web_app.post("/")
async def generate_speech_endpoint(item: GenerateRequest):
    """
    Receives JSON: {"text": "...", "voice": "...", "rate": "+10%", "pitch": "-5Hz", "volume": "+10%"}
    Returns JSON: {"status": "success", "audio_url": "..."}
    """
    text = item.text
    voice = item.voice
    rate = item.rate
    pitch = item.pitch
    volume = item.volume
    
    if not text:
        return {"status": "error", "message": "No text provided"}

    print(f"Generating: {text[:20]}... | Voice: {voice} | Rate: {rate} | Pitch: {pitch} | Volume: {volume}")
    
    try:
        # Generate with Edge TTS
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume)
        
        # We need to capture the audio data in memory
        # edge-tts async API yields chunks
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
                
        if not audio_data:
             raise Exception("No audio data generated")

        print(f"Edge TTS generated {len(audio_data)} bytes.")

        # Upload to Cloudflare R2
        r2_bucket = os.environ["R2_BUCKET_NAME"]
        r2_account_id = os.environ["R2_ACCOUNT_ID"]
        r2_access_key = os.environ["R2_ACCESS_KEY_ID"]
        r2_secret_key = os.environ["R2_SECRET_ACCESS_KEY"]
        
        from botocore.config import Config
        
        s3 = boto3.client(
            's3',
            endpoint_url=f"https://{r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=r2_access_key,
            aws_secret_access_key=r2_secret_key,
            config=Config(signature_version='s3v4')
        )
        
        filename = f"{uuid.uuid4()}.mp3"
        
        s3.upload_fileobj(
            io.BytesIO(audio_data),
            r2_bucket,
            filename,
            ExtraArgs={'ContentType': 'audio/mpeg'}
        )

        # Construct Public URL
        # Note: If bucket is public, we can use public endpoint. 
        # For now generating presigned for safety/consistency with previous code.
        audio_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': r2_bucket, 'Key': filename},
            ExpiresIn=3600
        )
        
        return {
            "status": "success", 
            "audio_url": audio_url
        }

    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}

@app.function(image=image, secrets=[secrets])
@modal.asgi_app()
def generate_speech():
    return web_app
