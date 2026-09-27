import os
import io
import uuid
import boto3
import modal
import asyncio
import edge_tts
import zipfile
from docx import Document
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Define the Modal image with necessary dependencies
# Define the Modal image with necessary dependencies
image = modal.Image.debian_slim().apt_install("ffmpeg").pip_install(
    "edge-tts",
    "boto3",
    "fastapi",
    "python-docx",
    "python-multipart"
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

class Segment(BaseModel):
    text: str
    voice: str
    rate: str = "+0%"
    pitch: str = "+0Hz"
    volume: str = "+0%"

class MultiSpeakerRequest(BaseModel):
    segments: list[Segment]

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

@web_app.post("/generate_multi")
async def generate_multi_speech_endpoint(item: MultiSpeakerRequest):
    """
    Generates audio for multiple segments and stitches them together.
    """
    segments = item.segments
    if not segments:
        return {"status": "error", "message": "No segments provided"}

    print(f"Generating Multi-Speaker Audio: {len(segments)} segments")

    try:
        file_id = str(uuid.uuid4())
        final_mp3_path = f"/tmp/{file_id}.mp3"
        
        # We process segments sequentially to maintain order and simplicity in filenames,
        # but we can parallelize the GENERATION of each segment.
        
        # 1. Prepare tasks
        segment_files = [f"/tmp/{file_id}_seg_{i}.mp3" for i in range(len(segments))]
        
        async def generate_segment(segment, index):
            try:
                # If text is empty, maybe skip? But let's assume valid text.
                if not segment.text.strip():
                    # Create silent MP3 or just skip? 
                    # For now handling empty text might strictly be an error or silence.
                    # Let's just create a very short silence or skip. 
                    # edge-tts might fail on empty text.
                    return

                communicate = edge_tts.Communicate(
                    segment.text, 
                    segment.voice, 
                    rate=segment.rate, 
                    pitch=segment.pitch, 
                    volume=segment.volume
                )
                await communicate.save(segment_files[index])
            except Exception as e:
                print(f"Error generating segment {index}: {e}")
                raise e

        # 2. Run in parallel
        await asyncio.gather(*(generate_segment(seg, i) for i, seg in enumerate(segments)))
        
        # 3. Merge files
        # Only merge files that actually exist (in case of skips/errors)
        valid_files = [f for f in segment_files if os.path.exists(f)]
        
        if not valid_files:
             return {"status": "error", "message": "No audio generated from segments"}

        with open(final_mp3_path, "wb") as outfile:
            for seg_path in valid_files:
                with open(seg_path, "rb") as infile:
                    outfile.write(infile.read())
                os.remove(seg_path)

        # 4. Upload to R2
        from botocore.config import Config
        s3 = boto3.client('s3',
            endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
            config=Config(signature_version='s3v4')
        )
        
        r2_key = f"generated/multi_{file_id}.mp3"
        
        with open(final_mp3_path, "rb") as f:
            s3.upload_fileobj(
                f, 
                os.environ['R2_BUCKET_NAME'], 
                r2_key,
                ExtraArgs={'ContentType': 'audio/mpeg'}
            )
            
        os.remove(final_mp3_path)

        # 5. Get URL
        audio_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': os.environ['R2_BUCKET_NAME'], 'Key': r2_key},
            ExpiresIn=3600
        )
        
        return {
            "status": "success", 
            "audio_url": audio_url,
            "segments_processed": len(valid_files)
        }

    except Exception as e:
        print(f"Error in multi-gen: {e}")
        return {"status": "error", "message": str(e)}

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

@web_app.post("/process_docx")
async def process_docx_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith(".docx"):
        return {"status": "error", "message": "Only .docx files are supported"}

    content = await file.read()
    file_stream = io.BytesIO(content)
    
    try:
        doc = Document(file_stream)
    except Exception as e:
        return {"status": "error", "message": f"Failed to parse document: {str(e)}"}

    scenes = []
    current_scene = None
    state = "LOOKING_FOR_SCENE"
    
    for para in doc.paragraphs:
        text = para.text.strip()
        
        if text.lower().startswith("scene "):
            if current_scene:
                scenes.append(current_scene)
            
            scene_idx_str = f"{len(scenes) + 1:02d}"
            current_scene = {
                "id": scene_idx_str,
                "script": "",
                "images": []
            }
            state = "LOOKING_FOR_SCRIPT"
            continue
            
        if not current_scene:
            continue
            
        if text.lower() == "spoken script:":
            state = "IN_SCRIPT"
            continue
        elif text.lower().startswith("suggested on-screen text:") or text.lower().startswith("editor note:") or text.lower().startswith("suggested visuals for this scene:"):
            state = "OTHER"
            
        if state == "IN_SCRIPT" and text:
            if not text.lower().startswith("editor note:") and not text.lower().startswith("suggested"):
                current_scene["script"] += text + " "
            
        # Extract images from this paragraph's runs
        for run in para.runs:
            for drawing in run._element.xpath('.//a:blip'):
                embed = drawing.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                if embed:
                    try:
                        image_part = doc.part.related_parts[embed]
                        img_bytes = image_part.blob
                        current_scene["images"].append(img_bytes)
                    except KeyError:
                        pass

    if current_scene:
        scenes.append(current_scene)

    if not scenes:
        return {"status": "error", "message": "No scenes found in the document"}

    sem = asyncio.Semaphore(5)

    async def generate_tts_for_scene(scene):
        script = scene["script"].strip()
        filename = f"{scene['id']}.mp3"
        chunks = split_text_into_chunks(script)
        audio_bytes = b""
        
        for chunk in chunks:
            async with sem:
                communicate = edge_tts.Communicate(chunk, "en-US-AriaNeural")
                async for data in communicate.stream():
                    if data["type"] == "audio":
                        audio_bytes += data["data"]
        return filename, audio_bytes

    tts_tasks = []
    for scene in scenes:
        if scene["script"].strip():
            tts_tasks.append(generate_tts_for_scene(scene))
            
    tts_results = await asyncio.gather(*tts_tasks, return_exceptions=True)
    
    # Filter out exceptions from results
    valid_tts_results = []
    for res in tts_results:
        if isinstance(res, Exception):
            print(f"Error generating TTS for scene: {res}")
        else:
            valid_tts_results.append(res)
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for scene in scenes:
            for img_idx, img_bytes in enumerate(scene["images"]):
                ext = ".png"
                if img_bytes.startswith(b'\xff\xd8'):
                    ext = ".jpg"
                img_name = f"{scene['id']}_{img_idx + 1}{ext}"
                zip_file.writestr(img_name, img_bytes)
                
        for filename, audio_bytes in valid_tts_results:
            if audio_bytes:
                zip_file.writestr(filename, audio_bytes)
            
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=course_assets.zip"}
    )

@app.function(image=image, secrets=[secrets], timeout=600)
@modal.asgi_app()
def generate_speech():
    return web_app
