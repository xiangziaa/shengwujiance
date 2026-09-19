import io
import json
import time
import wave
import urllib.request
from pathlib import Path
import numpy as np
import sherpa_onnx as sherpa

ROOT = Path(__file__).resolve().parent
MODEL = ROOT / 'models' / 'sherpa-onnx-zipvoice-distill-int8-zh-en-emilia'
OUT = ROOT.parent / 'output' / 'assistant-new-models'
OUT.mkdir(parents=True, exist_ok=True)
PROMPT = '您好，我是小安。请查看检测结果。'
TEXT = '您好，我是小安。四号样品需要复核。请核对检测数据，并按提示完成后续处理。'
config = sherpa.OfflineTtsConfig(model=sherpa.OfflineTtsModelConfig(zipvoice=sherpa.OfflineTtsZipvoiceModelConfig(
    tokens=str(MODEL / 'tokens.txt'), encoder=str(MODEL / 'encoder.int8.onnx'), decoder=str(MODEL / 'decoder.int8.onnx'),
    data_dir=str(MODEL / 'espeak-ng-data'), lexicon=str(MODEL / 'lexicon.txt'), vocoder=str(ROOT / 'models' / 'vocos_24khz.onnx')
),num_threads=4))
assert config.validate()
tts = sherpa.OfflineTts(config)
results = []
for voice in ['melo:0','kokoro:3']:
    request = urllib.request.Request('http://127.0.0.1:8765/tts',data=json.dumps({'text':PROMPT,'voice':voice,'rate':1}).encode(),headers={'Content-Type':'application/json'})
    reference = urllib.request.urlopen(request,timeout=60).read()
    (OUT / ('reference-'+voice.replace(':','-')+'.wav')).write_bytes(reference)
    with wave.open(io.BytesIO(reference)) as wav:
        sample_rate = wav.getframerate()
        samples = np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2').astype(np.float32)/32768
    gen = sherpa.GenerationConfig()
    gen.reference_audio = samples
    gen.reference_sample_rate = sample_rate
    gen.reference_text = PROMPT
    gen.num_steps = 4
    start = time.perf_counter()
    audio = tts.generate(TEXT,gen)
    file = OUT / ('zipvoice-'+voice.replace(':','-')+'.wav')
    data = np.asarray(audio.samples)
    assert data.size and np.isfinite(data).all()
    with wave.open(str(file),'wb') as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(audio.sample_rate)
        wav.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
    result={'model':'ZipVoice-Distill INT8','reference':voice,'text':TEXT,'file':file.name,'seconds_to_generate':round(time.perf_counter()-start,2),'audio_seconds':round(len(data)/audio.sample_rate,2)}
    results.append(result); print(result,flush=True)
(OUT / 'zipvoice-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
