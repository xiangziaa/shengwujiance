"""Build a local, network-free audition page from completed real syntheses."""
from pathlib import Path
import json
import html

OUT = Path(__file__).resolve().parents[1] / 'output' / 'assistant-new-models'
records = []
for filename in ['qwen-results.json','zipvoice-results.json']:
    path = OUT / filename
    if path.exists():
        records.extend(json.loads(path.read_text(encoding='utf-8')))
cards = []
for row in records:
    if not (OUT / row['file']).exists():
        continue
    if row['model'].startswith('Qwen'):
        name = f"Qwen · {row['speaker']} 系统播报"
        note = '根据系统助手语气指令生成，使用本机显卡。'
    else:
        name = 'ZipVoice · ' + ('标准助手' if row['reference']=='melo:0' else '清亮助手')
        note = '根据合成女声短参考音重新生成，使用本机 CPU。'
    cards.append(f'<article><h2>{html.escape(name)}</h2><p>{note}</p><audio controls preload="none" src="{html.escape(row["file"])}" aria-label="{html.escape(name)}"></audio><small>合成 {row["seconds_to_generate"]} 秒 · 音频 {row["audio_seconds"]} 秒</small></article>')
text = records[0]['text'] if records else ''
(OUT / 'index.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>小安 · 新模型试听</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f7fa;color:#182230;font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1040px;margin:40px auto;padding:0 24px}h1{font-size:30px}p,small{color:#475467}blockquote{margin:24px 0;padding:20px;border-left:4px solid #2878ff;background:#eaf2ff;border-radius:8px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}article{padding:24px;background:white;border:1px solid #d0d5dd;border-radius:12px}h2{font-size:19px;margin:0}audio{width:100%;margin:16px 0}small{display:block}footer{margin:24px 0;font-size:14px}
</style><main><h1>系统播报感，保留一点自然</h1><p>相同复核提示 · 两种新模型 · 四个离线女声候选。当前默认保持不变。</p><blockquote>'''+html.escape(text)+'''</blockquote><section class="grid">'''+''.join(cards)+'''</section><footer>这些是本机实际生成的文件。耗时不含加载模型，不代表音质评分。请重点比较吐字、停顿、语气是否像系统提示，以及连续听是否舒服。Qwen 采用固定系统播报指令；ZipVoice 使用已有合成女声作参考，不使用真人录音。</footer></main><script>document.addEventListener('play',event=>{document.querySelectorAll('audio').forEach(audio=>{if(audio!==event.target)audio.pause()})},true)</script></html>''',encoding='utf-8')
print('Audition cards:',len(cards))
