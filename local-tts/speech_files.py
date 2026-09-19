"""Persistent project WAV files keyed by spoken text, voice and speed."""
import hashlib
import io
import json
import os
import re
import tempfile
import wave
from pathlib import Path
from qwen_style import pace
from qwen_voices import SPEAKERS

ROOT = Path(__file__).resolve().parent / 'audio'
VOICES = set(SPEAKERS)

def normalize_text(text):
    for term, spoken in [('qPCR', '荧光定量聚合酶链式反应'), ('ELISA', '酶联免疫吸附检测'), ('AI', '人工智能'), ('DON', '呕吐毒素'), ('ZEN', '玉米赤霉烯酮')]:
        text = re.sub(term, spoken, text, flags=re.IGNORECASE)
    return text.strip()

def path_for(text, voice, rate):
    # Bump the revision when model or synthesis instructions change.
    # Standard pace is unchanged, so preserve the pre-generated defaults.
    # All old stretched Qwen files are excluded by a new revision and pace key.
    identity = [2, normalize_text(text), voice, pace(rate)] if voice.startswith('qwen:') and rate != 1 else [1, normalize_text(text), voice, float(rate)]
    key = json.dumps(identity, ensure_ascii=False)
    return ROOT / voice.replace(':', '-') / (hashlib.sha256(key.encode()).hexdigest() + '.wav')

def read(text, voice, rate):
    path = path_for(text, voice, rate)
    try:
        audio = path.read_bytes()
        validate(audio)
        return audio
    except (OSError, EOFError, wave.Error, ValueError):
        return None

def validate(audio):
    with wave.open(io.BytesIO(audio)) as wav:
        if not wav.getnframes() or len(wav.readframes(wav.getnframes())) != wav.getnframes() * wav.getnchannels() * wav.getsampwidth():
            raise ValueError('Incomplete WAV')

def write(text, voice, rate, audio):
    validate(audio)
    path = path_for(text, voice, rate)
    path.parent.mkdir(parents=True, exist_ok=True)
    name = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, suffix='.tmp', delete=False) as temporary:
            name = temporary.name
            temporary.write(audio)
        os.replace(name, path)
    finally:
        if name and os.path.exists(name):
            os.unlink(name)
    return path

def has_voice(voice):
    return any((ROOT / voice.replace(':', '-')).glob('*.wav'))
