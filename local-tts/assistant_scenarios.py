"""Reproducible scenario audio and approximate pitch measurements, not a listening score."""
from pathlib import Path
import json
import io
import wave
import time
import numpy as np
import engines

SCENARIOS = {
    'welcome': '您好，我是小安。可以为您查询检测结果、复核任务和风险预警。',
    'result': '检测结果已更新。四号样品的吸光度为零点八六二，超出标准曲线范围，请复核。',
    'warning': '异常预警。当前存在超标风险样品，请立即复核检测数据，并跟进处置流程。',
}
OUT = Path(__file__).resolve().parents[1] / 'output' / 'assistant-voices'
OUT.mkdir(parents=True, exist_ok=True)

def pitch_stats(data):
    with wave.open(io.BytesIO(data)) as wav:
        rate = wav.getframerate()
        samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(float) / 32768
    stride = max(1, int(rate / 8000))
    samples = samples[::stride]; rate /= stride
    size = int(rate * .04); pitches = []
    for i in range(0, len(samples) - size, int(rate * .02)):
        frame = samples[i:i+size]; frame = frame - frame.mean()
        if np.sqrt(np.mean(frame * frame)) < .018: continue
        corr = np.correlate(frame, frame, 'full')[size-1:]
        low, high = int(rate / 400), int(rate / 100)
        lag = np.argmax(corr[low:high]) + low
        if corr[lag] / max(corr[0], 1e-9) > .65: pitches.append(rate / lag)
    return {'median_hz': round(float(np.median(pitches))), 'pitch_span_semitones': round(float(12 * np.log2(np.percentile(pitches,90) / np.percentile(pitches,10))), 1)} if pitches else {}

if __name__ == '__main__':
    engines.load_engines()
    results = []
    for voice in engines.voices():
        for scene, text in SCENARIOS.items():
            start = time.perf_counter()
            audio = engines.synthesize(text, voice['id'], 1)
            name = voice['id'].replace(':','-') + '-' + scene + '.wav'
            (OUT / name).write_bytes(audio)
            result = {'voice':voice['id'], 'scene':scene, 'file':name, 'text':text, 'seconds_to_generate':round(time.perf_counter()-start,2), **pitch_stats(audio)}
            results.append(result); print(result, flush=True)
    (OUT / 'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
