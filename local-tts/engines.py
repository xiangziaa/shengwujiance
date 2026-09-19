"""Qwen female voices only."""
import json
import time
import urllib.request
import speech_files
from qwen_voices import SPEAKERS
DEFAULT_VOICE = 'qwen:vivian'
ERRORS = {}
_qwen_checked = 0
_qwen_ready = False

def qwen_ready():
    global _qwen_checked, _qwen_ready
    if time.monotonic() - _qwen_checked > 5:
        _qwen_checked = time.monotonic()
        try:
            with urllib.request.urlopen('http://127.0.0.1:8766/health', timeout=.5) as response:
                data = json.load(response)
                _qwen_ready = data.get('service') == 'xiaoan-qwen-worker' and data.get('ready') is True
        except Exception:
            _qwen_ready = False
    return _qwen_ready


def load_engines():
    print('Qwen only; other engines disabled', flush=True)

def voices():
    ready = qwen_ready()
    return [{'id': voice, 'name': entry[1], 'engine': 'Qwen 女声', 'canGenerate': ready} for voice, entry in SPEAKERS.items() if ready or speech_files.has_voice(voice)]

def synthesize(text, voice, rate):
    request = urllib.request.Request('http://127.0.0.1:8766/tts', data=json.dumps({'text': text, 'speaker': SPEAKERS[voice][0], 'rate': rate}).encode(), headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(request, timeout=600) as response:
        return response.read()
