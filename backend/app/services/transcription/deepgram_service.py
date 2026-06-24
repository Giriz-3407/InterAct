import asyncio
import json
import logging
import os
import websockets
from typing import Callable, Awaitable

logger = logging.getLogger("interact.transcription")

class DeepgramTranscriptionSession:
    """
    Manages a single streaming Speech-to-Text session with Deepgram
    for a specific room participant.
    """
    def __init__(
        self,
        room_code: str,
        socket_id: str,
        display_name: str,
        on_transcript: Callable[[str, bool], Awaitable[None]],
        api_key: str = None
    ):
        self.room_code = room_code
        self.socket_id = socket_id
        self.display_name = display_name
        self.on_transcript = on_transcript
        self.api_key = api_key or os.getenv("DEEPGRAM_API_KEY")
        self.dg_ws = None
        self.is_active = False

    async def connect(self):
        """
        Establish a connection to the Deepgram Streaming API.
        """
        if not self.api_key:
            raise ValueError("DEEPGRAM_API_KEY environment variable is not set")
        
        headers = {
            "Authorization": f"Token {self.api_key}"
        }
        
        # Configure Deepgram options
        url = (
            "wss://api.deepgram.com/v1/listen"
            "?model=nova-2"
            "&smart_format=true"
            "&interim_results=true"
            "&endpointing=300"
        )
        
        logger.info(f"Connecting to Deepgram STT for participant {self.display_name} ({self.socket_id}) in room {self.room_code}")
        self.dg_ws = await websockets.connect(url, additional_headers=headers)
        self.is_active = True
        logger.info(f"Connected to Deepgram STT successfully for {self.display_name}")

    async def send_audio(self, data: bytes):
        """
        Forward binary audio chunk to Deepgram.
        """
        if self.dg_ws and self.is_active:
            await self.dg_ws.send(data)

    async def close(self):
        """
        Clean up connection state and notify Deepgram that the stream is finished.
        """
        self.is_active = False
        if self.dg_ws:
            try:
                # Send CloseStream message to let Deepgram flush final transcripts
                await self.dg_ws.send(json.dumps({"type": "CloseStream"}))
                await self.dg_ws.close()
            except Exception as e:
                logger.warning(f"Error during Deepgram connection close: {e}")
            finally:
                self.dg_ws = None

    async def receive_transcripts_loop(self):
        """
        Listen to transcripts from Deepgram and call the handler.
        """
        try:
            async for message in self.dg_ws:
                if not self.is_active:
                    break
                
                data = json.loads(message)
                channel = data.get("channel", {})
                alternatives = channel.get("alternatives", [])
                if not alternatives:
                    continue
                
                alternative = alternatives[0]
                transcript = alternative.get("transcript", "").strip()
                is_final = data.get("is_final", False)
                
                if transcript:
                    await self.on_transcript(transcript, is_final)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Deepgram connection closed for {self.display_name}")
        except Exception as e:
            logger.error(f"Error receiving from Deepgram for {self.display_name}: {e}")
        finally:
            self.is_active = False
