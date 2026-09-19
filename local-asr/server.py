"""Loopback-only, CPU, offline Paraformer recognizer. Audio is never saved."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import threading
import time
import numpy as np
import sherpa_onnx

ROOT = Path(__file__).resolve().parent / 'models' / 'paraformer-zh-small-onnx'
LOCK = threading.Lock()
recognizer = None

def load_model():
    return sherpa_onnx.OfflineRecognizer.from_paraformer(
        paraformer=str(ROOT / 'model_int8.onnx'), tokens=str(ROOT / 'tokens.txt'),
        num_threads=2, sample_rate=16000, feature_dim=80, provider='cpu',
    )

def transcribe(pcm):
    samples = np.frombuffer(pcm, dtype='<i2').astype(np.float32) / 32768.0
    stream = recognizer.create_stream()
    stream.accept_waveform(16000, samples)
    recognizer.decode_stream(stream)
    return stream.result.text

class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def reply(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def do_OPTIONS(self):
        self.reply(200, {})

    def do_GET(self):
        if self.path != '/health':
            self.reply(404, {'error': 'Not found'})
            return
        self.reply(200, {'ready': True, 'model': 'paraformer-zh-small-onnx', 'offline': True, 'sampleRate': 16000})

    def do_POST(self):
        if self.path != '/recognize':
            self.reply(404, {'error': 'Not found'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            # Consume bounded bodies before rejecting them so Windows does not
            # reset the connection with unread request data and lose the reply.
            if not 0 <= length <= 384000:
                raise ValueError('Expected at most 12 seconds of PCM16 audio')
            pcm = self.rfile.read(length)
            if self.headers.get('Content-Type') != 'application/octet-stream' or not 3200 <= length <= 384000 or length % 2:
                raise ValueError('Expected 0.1–12 seconds of mono 16 kHz PCM16 little endian')
            if len(pcm) != length:
                raise ValueError('Incomplete PCM data')
        except (ValueError, TimeoutError) as error:
            self.reply(400, {'error': str(error)})
            return
        if not LOCK.acquire(blocking=False):
            self.reply(503, {'error': 'Recognizer busy'})
            return
        try:
            started = time.perf_counter()
            text = transcribe(pcm)
            self.reply(200, {'text': text, 'elapsedMs': round((time.perf_counter() - started) * 1000)})
        except Exception:
            self.reply(500, {'error': 'Local recognition failed'})
        finally:
            LOCK.release()

if __name__ == '__main__':
    recognizer = load_model()
    print('Offline ASR ready: http://127.0.0.1:8767 (Paraformer small, CPU)', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8767), Handler).serve_forever()
