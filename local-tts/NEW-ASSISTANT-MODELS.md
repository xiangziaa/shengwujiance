# 新一轮系统助手模型

目标：中文女声、系统通知风格、语调平稳，同时保留连贯发音和少量亲和感。当前默认已改为 Qwen Vivian，并通过项目本地 WAV 预生成降低播报等待；其他模型保留为备选。

## Qwen3-TTS 1.7B CustomVoice

官方：https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice

使用 Vivian、Serena 两个中文预设女声，统一传入系统播报指令，控制语气、停顿和情绪，而不是单纯更换音色。1.7B 版支持 instruction；0.6B 版不支持此能力，所以本轮选 1.7B。模型为 Apache-2.0。

独立环境：Python 3.11、qwen-tts 0.1.1、torch/torchaudio 2.8.0 CUDA 12.8。

```powershell
uv venv --python 3.11 local-tts/.venv-qwen
uv pip install --python local-tts/.venv-qwen/Scripts/python.exe qwen-tts==0.1.1
uv pip install --python local-tts/.venv-qwen/Scripts/python.exe torch==2.8.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cu128
python local-tts/download_qwen.py
local-tts/.venv-qwen/Scripts/python.exe local-tts/try_qwen.py
```

生成样音后，运行 `local-tts/start-qwen.ps1` 启动可选 GPU 服务（127.0.0.1:8766）。小安主服务会检测模型是否就绪；已有本地文件的 Qwen 声线也会继续显示。退出此服务可释放显卡资源，已有文件仍可播报，未生成的内容需要重新启动显卡服务。

运行时设置 HF_HUB_OFFLINE、TRANSFORMERS_OFFLINE，只读本地模型，不请求线上 TTS。固定种子用于对比复现，不代表逐次输出绝对相同。语速调整已改为“稍慢／标准／稍快”的模型指令，不再使用后期时间拉伸；不承诺精确倍速。

## ZipVoice-Distill INT8

官方：https://github.com/k2-fsa/ZipVoice

推理示例：https://github.com/k2-fsa/sherpa-onnx/blob/master/python-api-examples/zipvoice-tts.py

中文和英文的流匹配 TTS，使用短参考音固定音色。本项目两条参考音由已有 MeloTTS、Kokoro 合成，不使用模型包中的真人示例。输出由 ZipVoice 重新生成，不是播放原录音。模型使用 CPU 推理。

模型：`sherpa-onnx-zipvoice-distill-int8-zh-en-emilia`；声码器：`vocos_24khz.onnx`，均来自 sherpa-onnx 官方 release。
运行 `python local-tts/try_zipvoice.py` 可复现两条试用样音，需先启动当前本机服务用于生成参考音。
参考音保存在 models/assistant-reference-0.wav 和 assistant-reference-1.wav，主服务启动时加载 ZipVoice。

## 对比方法与边界

2026-09-19 本机实测：Qwen Vivian 生成 8.88 秒音频耗时 20.61 秒；Serena 生成 6.56 秒音频耗时 13.11 秒。模型加载约 4.7 秒，PyTorch 峰值分配显存 4.08 GB（不含桌面和其他程序）。两条样音均在离线模式下成功生成。当前采用整段生成再播放，因此点击后需要等待，较长内容等待更久；目前预生成支持最多 600 秒的模型请求，普通实时播报的前端仍以 90 秒为限。

ZipVoice 两条样音生成耗时分别为 1.98 秒和 2.41 秒。上述结果只用于本机延迟比较，不能当作音质排名。

最初接入时的主服务联调记录（默认声线现已改为 Vivian）：`/health` 返回六个可用声线，默认保持 `melo:0`；经 8765 请求 `qwen:vivian`、语速 1.1，成功返回 24 kHz 单声道 WAV，音频 4.07 秒，请求耗时 21.31 秒（包括首次语速处理）。验证文件为 `output/assistant-new-models/qwen-vivian-service-rate110.wav`。

运行 `python local-tts/build_new_auditions.py` 更新对比页，打开 `../output/assistant-new-models/index.html` 试听。Qwen 服务需要与主服务同时运行；重启电脑后分别运行 `start-local-tts.ps1` 和 `start-qwen.ps1`，再在设置中点击“重新检测”。

统一文本：“您好，我是小安。四号样品需要复核。请核对检测数据，并按提示完成后续处理。”

WAV 和耗时记录在 output/assistant-new-models。只报告实际生成是否成功和耗时，不把模型宣传、音高指标或波形验证当作主观听评。最终“像系统助手但不过分机械”的程度需要直接对比试听。
