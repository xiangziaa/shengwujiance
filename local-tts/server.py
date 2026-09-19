from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import threading
import engines
import speech_files

LOCK = threading.Lock()

class Handler(BaseHTTPRequestHandler):
    def reply(self, status, data, content_type='application/json'):
        if not isinstance(data, bytes):
            data = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def do_OPTIONS(self):
        self.reply(204, b'')

    def do_GET(self):
        if self.path != '/health':
            self.reply(404, {'error': 'Not found'})
            return
        available = engines.voices()
        self.reply(200 if available else 503, {
            'service': 'xiaoan-local-tts', 'ready': bool(available),
            'voices': available, 'defaultVoice': engines.DEFAULT_VOICE,
            'errors': engines.ERRORS,
        })

    def do_POST(self):
        if self.path not in ['/tts', '/prepare']:
            self.reply(404, {'error': 'Not found'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 24000:
                raise ValueError('Invalid request size')
            payload = json.loads(self.rfile.read(length))
            text = payload.get('text')
            if not isinstance(text, str) or not 0 < len(text.strip()) <= 3000:
                raise ValueError('text must contain 1-3000 characters')
            voice = payload.get('voice') or engines.DEFAULT_VOICE
            if voice not in speech_files.VOICES:
                raise ValueError('Unknown local voice')
            rate = float(payload.get('rate', 1))
            if not math.isfinite(rate) or not .7 <= rate <= 1.5:
                raise ValueError('Invalid rate')
        except (ValueError, TypeError, AttributeError):
            self.reply(400, {'error': 'Invalid text, voice or rate'})
            return
        text = speech_files.normalize_text(text)
        cached = speech_files.read(text, voice, rate)
        def deliver(audio, reused):
            if self.path == '/prepare':
                self.reply(200, {'ready': True, 'reused': reused, 'file': str(speech_files.path_for(text, voice, rate).relative_to(speech_files.ROOT.parent))})
            else:
                self.reply(200, audio, 'audio/wav')
        if cached is not None:
            deliver(cached, True)
            return
        if voice.startswith('qwen:') and not engines.qwen_ready():
            self.reply(503, {'error': '这条语音尚未生成，请启动 Qwen 服务后保存全部设置。'})
            return
        if not LOCK.acquire(blocking=False):
            self.reply(503, {'error': 'Local model busy; retry shortly'})
            return
        try:
            audio = engines.synthesize(text, voice, rate)
            speech_files.write(text, voice, rate, audio)
            deliver(audio, False)
        except Exception:
            self.reply(500, {'error': 'Speech synthesis failed'})
        finally:
            LOCK.release()

if __name__ == '__main__':
    engines.load_engines()
    print('Local TTS listening on http://127.0.0.1:8765', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
