"""Generate the same Chinese broadcast with independent offline models."""
import json
import time
import io
import wave
from pathlib import Path
import engines

TEXT = '您好，我是小安。检测结果已经更新，四号样品需要复核。请注意，黄曲霉毒素含量超过限值，请及时核对数据，并跟进处置流程。'
OUT = Path(__file__).resolve().parents[1] / 'output' / 'tts-comparison'
OUT.mkdir(parents=True, exist_ok=True)
engines.load_engines()
try:
    engines.ENGINES['matcha'] = engines.create_engine('matcha')
except Exception as exc:
    print('Matcha unavailable', exc, flush=True)
results = []
for voice in ['kokoro:3', 'kokoro:4', 'kokoro:5', 'kokoro:6', 'kokoro:7', 'kokoro:8', 'melo:0', 'matcha:0', 'piper:zh_CN-huayan-medium']:
    if voice.split(':')[0] not in engines.ENGINES:
        continue
    start = time.perf_counter()
    data = engines.synthesize(TEXT, voice, 1)
    file = voice.replace(':', '-') + '.wav'
    (OUT / file).write_bytes(data)
    with wave.open(io.BytesIO(data)) as wav:
        duration = wav.getnframes() / wav.getframerate()
    row = {'voice': voice, 'file': file, 'seconds_to_generate': round(time.perf_counter() - start, 2), 'audio_seconds': round(duration, 2)}
    results.append(row)
    print(row, flush=True)
(OUT / 'results.json').write_text(json.dumps({'text':TEXT,'results':results},ensure_ascii=False,indent=2),encoding='utf-8')
