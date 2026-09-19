"""Download the official CUDA wheel in resumable ranges and verify its SHA-256."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import shutil
import time
import urllib.request

ROOT = Path(__file__).resolve().parent / '.downloads'
ROOT.mkdir(exist_ok=True)
NAME = 'torch-2.8.0+cu128-cp311-cp311-win_amd64.whl'
URL = 'https://download.pytorch.org/whl/cu128/torch-2.8.0%2Bcu128-cp311-cp311-win_amd64.whl'
SHA256 = '34c55443aafd31046a7963b63d30bc3b628ee4a704f826796c865fdfd05bb596'
TOTAL = 3461420395
SIZE = 32 * 1024 * 1024

def download(start):
    end = min(TOTAL-1, start+SIZE-1)
    path = ROOT / f'torch-range-{start}.part'
    if path.exists() and path.stat().st_size == end-start+1:
        return path
    for attempt in range(4):
        try:
            request = urllib.request.Request(URL+f'?part={start}',headers={'Range':f'bytes={start}-{end}'})
            with urllib.request.urlopen(request,timeout=120) as response:
                if response.status != 206 or response.headers.get('Content-Range') != f'bytes {start}-{end}/{TOTAL}':
                    raise ValueError('Invalid response range')
                with path.open('wb') as output:
                    shutil.copyfileobj(response,output)
            if path.stat().st_size != end-start+1:
                raise ValueError('Incomplete range')
            if start % (SIZE*8) == 0:
                print('Completed range at',start,flush=True)
            return path
        except Exception:
            if attempt == 3: raise
            time.sleep(2)

if __name__ == '__main__':
    target = ROOT / NAME
    if not target.exists():
        with ThreadPoolExecutor(max_workers=12) as executor:
            parts = list(executor.map(download,range(0,TOTAL,SIZE)))
        temp = target.with_suffix('.assembling')
        with temp.open('wb') as output:
            for part in parts:
                with part.open('rb') as source:
                    shutil.copyfileobj(source,output)
        with temp.open('rb') as stream:
            digest = hashlib.file_digest(stream,'sha256').hexdigest()
        if digest != SHA256: raise ValueError('SHA-256 mismatch')
        temp.replace(target)
    with target.open('rb') as stream:
        assert hashlib.file_digest(stream,'sha256').hexdigest() == SHA256
    print('Verified',target,flush=True)
