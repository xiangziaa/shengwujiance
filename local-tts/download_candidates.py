from pathlib import Path
import urllib.request
import tarfile
from concurrent.futures import ThreadPoolExecutor
ROOT = Path(__file__).resolve().parent / 'models'
ITEMS = [
('kokoro-multi-lang-v1_1.tar.bz2', 'tts-models'),
('matcha-icefall-zh-baker.tar.bz2', 'tts-models'),
('vits-melo-tts-zh_en.tar.bz2', 'tts-models'),
('vocos-22khz-univ.onnx', 'vocoder-models'),
]
def download(item):
    name, tag = item
    file = ROOT / name
    if not file.exists():
        print('Downloading', name, flush=True)
        part = file.with_suffix(file.suffix + '.part')
        urllib.request.urlretrieve(f'https://github.com/k2-fsa/sherpa-onnx/releases/download/{tag}/{name}', part)
        part.replace(file)
    if name.endswith('.tar.bz2'):
        with tarfile.open(file) as archive:
            archive.extractall(ROOT, filter='data')
    print('Ready', name, flush=True)
if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=3) as executor:
        list(executor.map(download, ITEMS))
