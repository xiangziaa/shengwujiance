"""Explicit installation step; the recognition server never downloads files."""
import hashlib
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parent / 'models' / 'paraformer-zh-small-onnx'
MODEL_SHA256 = '3ef6c19369b912f7caf3cef8e545c5ccd1a33d9d7ec792a46668dc41c4b229ec'
MODEL_URL = 'https://huggingface.co/OpenVoiceOS/paraformer-zh-small-onnx/resolve/e580070c6a895c525dd463f3ff6a35409a3bfbe2/'
UPSTREAM_URL = 'https://huggingface.co/csukuangfj/sherpa-onnx-paraformer-zh-small-2024-03-09/resolve/63ddc3cd0f2810b68289a7b3876e62ef5d53d6df/'

def download(name, url, checksum=None):
    target = ROOT / name
    if target.exists() and (not checksum or hashlib.sha256(target.read_bytes()).hexdigest() == checksum):
        return
    temporary = target.with_suffix(target.suffix + '.part')
    print('Downloading', name, flush=True)
    with urllib.request.urlopen(url, timeout=120) as source, temporary.open('wb') as output:
        while chunk := source.read(1024 * 1024):
            output.write(chunk)
    if checksum and hashlib.sha256(temporary.read_bytes()).hexdigest() != checksum:
        raise RuntimeError(f'Checksum mismatch: {name}')
    temporary.replace(target)

if __name__ == '__main__':
    ROOT.mkdir(parents=True, exist_ok=True)
    download('model_int8.onnx', MODEL_URL + 'model_int8.onnx', MODEL_SHA256)
    download('tokens.txt', UPSTREAM_URL + 'tokens.txt')
    download('MODEL_CARD.md', MODEL_URL + 'README.md')
    download('test.wav', UPSTREAM_URL + 'test_wavs/0.wav')
    print('Model ready:', ROOT)
