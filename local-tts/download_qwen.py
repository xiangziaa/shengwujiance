import json
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
ROOT = Path(__file__).resolve().parent / 'models' / 'qwen3-tts-1.7b-customvoice'
REPO = 'Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice'
def download(name):
    target = ROOT / name
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists(): return
    print('Downloading', name, flush=True)
    part = target.with_suffix(target.suffix + '.part')
    urllib.request.urlretrieve(f'https://huggingface.co/{REPO}/resolve/main/{name}', part)
    part.replace(target)
    print('Ready', name, flush=True)
if __name__ == '__main__':
    info = json.load(urllib.request.urlopen(f'https://huggingface.co/api/models/{REPO}'))
    files = [f['rfilename'] for f in info['siblings'] if f['rfilename'].endswith(('.json','.safetensors','.txt','.md'))]
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(download, files))
