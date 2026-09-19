"""Qwen assistant-style voice audition; runs in .venv-qwen with no network."""
import os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
import json
import time
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / 'output' / 'assistant-new-models'
OUT.mkdir(parents=True, exist_ok=True)
TEXT = '您好，我是小安。四号样品需要复核。请核对检测数据，并按提示完成后续处理。'
INSTRUCTION = '使用标准普通话，以智能检测系统助手的口吻播报。声音清晰、平稳、简洁、专业，带少量亲和感。语速适中，句间停顿明确，语调起伏克制。不要聊天口吻，不要撒娇，不要气声，不要夸张情绪，也不要逐字机械朗读。'
assert torch.cuda.is_available(), 'CUDA runtime unavailable'
torch.set_num_threads(4)
start = time.perf_counter()
model = Qwen3TTSModel.from_pretrained(str(ROOT / 'models' / 'qwen3-tts-1.7b-customvoice'), device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)
print('Loaded in', round(time.perf_counter()-start,2), 'seconds', flush=True)
results = []
for speaker in ['Vivian', 'Serena']:
    torch.manual_seed(42)
    start = time.perf_counter()
    wavs, rate = model.generate_custom_voice(text=TEXT, language='Chinese', speaker=speaker, instruct=INSTRUCTION, max_new_tokens=768, temperature=0.65)
    samples = np.asarray(wavs[0])
    assert samples.size and np.isfinite(samples).all()
    filename = f'qwen-{speaker.lower()}-assistant.wav'
    sf.write(OUT / filename, samples, rate, subtype='PCM_16')
    row = {'model':'Qwen3-TTS 1.7B CustomVoice','speaker':speaker,'text':TEXT,'instruction':INSTRUCTION,'file':filename,'seconds_to_generate':round(time.perf_counter()-start,2),'audio_seconds':round(len(samples)/rate,2),'peak_gpu_gb':round(torch.cuda.max_memory_allocated()/1024**3,2)}
    results.append(row); print(row, flush=True)
    (OUT / 'qwen-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
