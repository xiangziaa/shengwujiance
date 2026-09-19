"""Generate default mappings for every female voice and natural pace; resumable."""
import hashlib
import io
import json
import re
import time
import urllib.request
import urllib.error
import wave
from pathlib import Path
import speech_files
from qwen_voices import SPEAKERS

ROOT = Path(__file__).resolve().parent
PACES = [('slow', 0.85), ('normal', 1.0), ('fast', 1.15)]

def presets():
    source = (ROOT.parent / 'frontend/src/utils/voiceMappings.ts').read_text(encoding='utf-8')
    block = source.split('export const defaultTaskMappings: VoiceMapping[] = [', 1)[1].split('\n]', 1)[0]
    rows = [{'id': 'welcome', 'keyword': '小安', 'text': '我在，请问有什么可以帮您？'}]
    rows.extend(dict(zip(['id', 'keyword', 'text'], values)) for values in re.findall(r"id: '([^']+)', keyword: '([^']+)', text: '([^']+)'", block))
    assert len(rows) == 5, 'Review frontend defaults before generating'
    return rows

def generate():
    rows = presets()
    total = len(rows) * len(SPEAKERS) * len(PACES)
    manifest = {'model': 'Qwen3-TTS-12Hz-1.7B-CustomVoice', 'expected_count': total, 'complete': False, 'files': []}
    manifest_path = ROOT / 'audio/defaults-all.json'
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    for voice in SPEAKERS:
        for pace, rate in PACES:
            for row in rows:
                start = time.perf_counter()
                request = urllib.request.Request('http://127.0.0.1:8765/prepare', data=json.dumps({'text': row['text'], 'voice': voice, 'rate': rate}).encode(), headers={'Content-Type': 'application/json'})
                for attempt in range(4):
                    try:
                        with urllib.request.urlopen(request, timeout=610) as response:
                            result = json.load(response)
                        break
                    except urllib.error.HTTPError as error:
                        if error.code != 503 or attempt == 3:
                            raise
                        time.sleep(5)
                assert result['ready']
                path = speech_files.path_for(row['text'], voice, rate)
                audio = path.read_bytes()
                speech_files.validate(audio)
                with wave.open(io.BytesIO(audio)) as wav:
                    assert wav.getnchannels() == 1 and wav.getsampwidth() == 2 and wav.getframerate() == 24000
                    duration = wav.getnframes() / wav.getframerate()
                entry = {**row, 'voice': voice, 'pace': pace, 'rate': rate, 'file': path.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(audio).hexdigest(), 'bytes': len(audio), 'audio_seconds': round(duration, 3)}
                manifest['files'].append(entry)
                manifest['complete'] = len(manifest['files']) == total
                temporary = manifest_path.with_suffix('.json.tmp')
                temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                temporary.replace(manifest_path)
                print(f"{len(manifest['files'])}/{total} {voice} {pace} {row['id']} | {duration:.2f}s audio | {time.perf_counter()-start:.2f}s | reused={result['reused']}", flush=True)
    print('COMPLETE', total, 'files', sum(row['bytes'] for row in manifest['files']), 'bytes', flush=True)

if __name__ == '__main__':
    generate()
