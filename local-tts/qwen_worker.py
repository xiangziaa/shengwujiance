"""Optional offline GPU worker. Use .venv-qwen/Scripts/python.exe to run."""
import os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
import io
import json
import threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel
from qwen_style import instruction
from qwen_voices import SPEAKERS

ROOT = Path(__file__).resolve().parent
MODEL = None
LOCK = threading.Lock()

class Handler(BaseHTTPRequestHandler):
    def reply(self, status, data, content_type='application/json'):
        if not isinstance(data, bytes):
            data = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def do_GET(self):
        if self.path == '/health':
            self.reply(200, {'service':'xiaoan-qwen-worker', 'ready': MODEL is not None})
        else:
            self.reply(404, {'error':'Not found'})

    def do_POST(self):
        if self.path != '/tts':
            self.reply(404, {'error':'Not found'}); return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 24000: raise ValueError()
            data = json.loads(self.rfile.read(length))
            text, speaker, rate = data['text'], data['speaker'], float(data.get('rate',1))
            if not isinstance(text,str) or not 0 < len(text) <= 3000 or speaker not in {entry[0] for entry in SPEAKERS.values()} or not .7 <= rate <= 1.5:
                raise ValueError()
        except (ValueError, TypeError, KeyError):
            self.reply(400, {'error':'Invalid input'}); return
        if not LOCK.acquire(blocking=False):
            self.reply(503, {'error':'GPU worker busy'}); return
        try:
            torch.manual_seed(42)
            wavs, sample_rate = MODEL.generate_custom_voice(text=text,language='Chinese',speaker=speaker,instruct=instruction(rate),max_new_tokens=2048,temperature=.65)
            samples = wavs[0]
            output = io.BytesIO()
            sf.write(output, samples, sample_rate, format='WAV', subtype='PCM_16')
            self.reply(200, output.getvalue(), 'audio/wav')
        except Exception as exc:
            print('Qwen generation failed:', exc, flush=True)
            self.reply(500, {'error':'Qwen generation failed'})
        finally:
            LOCK.release()

if __name__ == '__main__':
    if not torch.cuda.is_available():
        raise SystemExit('CUDA unavailable')
    torch.set_num_threads(4)
    MODEL = Qwen3TTSModel.from_pretrained(str(ROOT / 'models' / 'qwen3-tts-1.7b-customvoice'),device_map='cuda:0',dtype=torch.bfloat16,attn_implementation='sdpa',local_files_only=True)
    print('Qwen worker ready on 127.0.0.1:8766',flush=True)
    ThreadingHTTPServer(('127.0.0.1',8766),Handler).serve_forever()
