"""Verify the shipped 60-file preset matrix; optionally test local HTTP playback."""
import argparse
import hashlib
import json
import urllib.request
from pathlib import Path
from prepare_defaults import PACES, presets
from qwen_voices import SPEAKERS
import speech_files

ROOT = Path(__file__).resolve().parent

def verify(http=False):
    manifest = json.loads((ROOT / 'audio/defaults-all.json').read_text(encoding='utf-8'))
    rows = presets()
    expected = {(row['id'], voice, pace) for row in rows for voice in SPEAKERS for pace, _ in PACES}
    entries = manifest['files']
    assert manifest['complete'] and manifest['expected_count'] == len(expected)
    assert len(entries) == len(expected) and {(row['id'], row['voice'], row['pace']) for row in entries} == expected
    texts = {row['id']: row['text'] for row in rows}
    for entry in entries:
        assert entry['text'] == texts[entry['id']]
        assert dict(PACES)[entry['pace']] == entry['rate']
        path = speech_files.path_for(entry['text'], entry['voice'], entry['rate'])
        assert entry['file'] == path.relative_to(ROOT).as_posix()
        data = path.read_bytes()
        speech_files.validate(data)
        assert len(data) == entry['bytes']
        assert hashlib.sha256(data).hexdigest() == entry['sha256']
        assert speech_files.read(entry['text'], entry['voice'], entry['rate']) == data
        if http:
            request = urllib.request.Request('http://127.0.0.1:8765/tts', data=json.dumps({'text': entry['text'], 'voice': entry['voice'], 'rate': entry['rate']}).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(request, timeout=5) as response:
                assert response.headers['Content-Type'] == 'audio/wav'
                assert response.read() == data
    print(f"Verified {len(entries)} presets; {sum(row['bytes'] for row in entries) / 1024**2:.2f} MiB; HTTP playback={http}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--http', action='store_true')
    verify(parser.parse_args().http)
