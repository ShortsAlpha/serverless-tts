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
# Define the Modal image with necessary dependencies
image = modal.Image.debian_slim().apt_install("ffmpeg").pip_install(
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

def split_text_into_chunks(text: str, max_chars: int = 2000) -> list[str]:
    """
    Splits text into chunks respecting sentence boundaries.
    """
    if len(text) <= max_chars:
        return [text]
        
    chunks = []
    current_chunk = ""
    
    # Simple splitting by sentence endings
    # replacing newlines with spaces to avoid weird breaks unless double newline
    paragraphs = text.replace("\r\n", "\n").split("\n")
    
    for para in paragraphs:
        if not para.strip(): 
            continue
            
        sentences = para.replace(". ", ".|").replace("? ", "?|").replace("! ", "!|").split("|")
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # If a single sentence is huge (unlikely but possible), split it blindly
            if len(sentence) > max_chars:
                # Should handle this edge case, but for now let's hope sentences aren't 2000 chars
                # If they are, just force add them and let Edge TTS try or error
                pass 
            
            if len(current_chunk) + len(sentence) + 1 <= max_chars:
                current_chunk += sentence + " "
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + " "
    
    if current_chunk:
        chunks.append(current_chunk.strip())
        
    return chunks

@web_app.post("/")
async def generate_speech_endpoint(item: GenerateRequest):
    """
    Receives JSON: {"text": "...", "voice": "...", ...}
    Returns JSON: {"status": "success", "audio_url": "..."}
    """
    text = item.text
    voice = item.voice
    rate = item.rate
    pitch = item.pitch
    volume = item.volume
    
    if not text:
        return {"status": "error", "message": "No text provided"}

    print(f"Generating: {len(text)} chars | Voice: {voice} | Rate: {rate}")
    
    try:
        chunks = split_text_into_chunks(text)
        print(f"Split into {len(chunks)} chunks.")
        
        # Determine unique ID for the final file
        file_id = str(uuid.uuid4())
        final_mp3_path = f"/tmp/{file_id}.mp3"
        
        # temporary list of chunk files
        # temporary list of chunk files
        chunk_files = [f"/tmp/{file_id}_part_{i}.mp3" for i in range(len(chunks))]
        
        async def generate_chunk(chunk_text, index):
            try:
                # print(f"Starting chunk {index+1}...")
                c = edge_tts.Communicate(chunk_text, voice, rate=rate, pitch=pitch, volume=volume)
                await c.save(chunk_files[index])
                # print(f"Finished chunk {index+1}")
            except Exception as e:
                print(f"Error generating chunk {index}: {e}")
                raise e

        # Run all chunks in parallel
        await asyncio.gather(*(generate_chunk(chunk, i) for i, chunk in enumerate(chunks)))
            
        # Merge chunks safely
        # We can just concatenate MP3 bytes for a simple merge
        with open(final_mp3_path, "wb") as outfile:
            for chunk_path in chunk_files:
                with open(chunk_path, "rb") as infile:
                    outfile.write(infile.read())
                # cleanup chunk
                os.remove(chunk_path)

        # Upload to R2
        from botocore.config import Config
        s3 = boto3.client('s3',
            endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
            config=Config(signature_version='s3v4')
        )
        
        r2_key = f"generated/{file_id}.mp3"
        
        with open(final_mp3_path, "rb") as f:
            s3.upload_fileobj(
                f, 
                os.environ['R2_BUCKET_NAME'], 
                r2_key,
                ExtraArgs={'ContentType': 'audio/mpeg'}
            )
            
        # Cleanup final file
        os.remove(final_mp3_path)

        # Generate Presigned URL
        audio_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': os.environ['R2_BUCKET_NAME'], 'Key': r2_key},
            ExpiresIn=3600
        )
        
        return {
            "status": "success", 
            "audio_url": audio_url,
            "chunks_processed": len(chunks)
        }

    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}

@app.function(image=image, secrets=[secrets], timeout=600)
@modal.asgi_app()
def generate_speech():
    return web_app
