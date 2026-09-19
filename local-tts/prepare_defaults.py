"""Pre-generate the actual frontend presets as project-local Vivian WAVs."""
import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
source = (ROOT.parent / 'frontend/src/utils/voiceMappings.ts').read_text(encoding='utf-8')
block = source.split('export const defaultTaskMappings: VoiceMapping[] = [', 1)[1].split('\n]', 1)[0]
texts = ['我在，请问有什么可以帮您？'] + re.findall(r"text: '([^']+)'", block)
assert len(texts) == 5, 'Review frontend defaults before generating'
results = []
for index, text in enumerate(texts):
    start = time.perf_counter()
    request = urllib.request.Request('http://127.0.0.1:8765/prepare', data=json.dumps({'text': text, 'voice': 'qwen:vivian', 'rate': 1}).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=610) as response:
        result = json.load(response)
    results.append({'text': text, **result, 'seconds': round(time.perf_counter() - start, 2)})
    print(f'{index + 1}/{len(texts)}: {results[-1]}', flush=True)
(ROOT / 'audio/defaults.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
