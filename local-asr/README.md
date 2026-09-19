# 本地中文语音识别

使用 [OpenVoiceOS/paraformer-zh-small-onnx](https://huggingface.co/OpenVoiceOS/paraformer-zh-small-onnx)，Apache-2.0，int8 ONNX 文件约 82 MB。权重与其 sherpa-onnx 上游完全相同，因此直接用 sherpa-onnx CPU 运行时及上游 tokens.txt，无需安装开发分支版 onnx-asr。

## 启动

在项目根目录执行（Windows，Python 3.13 已验证）：

```powershell
# 仅首次安装需要联网
./local-asr/setup.ps1
# 每次使用启动；不会下载模型或访问外网
./local-asr/start-local-asr.ps1
```

完成首次安装后，也可以双击项目根目录的 `start-dev.bat`，同时启动网页和 ASR。使用时保留前端和 ASR 服务窗口，关闭对应窗口即可停止服务。音频播放无需 TTS 服务。浏览器刷新后，点击启用语音并允许麦克风，即可说设置中的关键词。AI 大屏及悬浮助手的麦克风提问也使用此服务。服务仅监听 `127.0.0.1:8767`，必须运行在使用浏览器的电脑上。

模型文件位于 `models/paraformer-zh-small-onnx`，虚拟环境位于 `.venv`，均不提交 Git。下载器固定来源版本并校验 ONNX SHA-256。模型来源说明保存在模型目录的 MODEL_CARD.md。

## 行为与限制

- 网页采集麦克风，以短时音量阈值分句，停顿约 0.6 秒后送入整句模型；长句最多每 10 秒分段。这不是流式模型。
- 音频转换为单声道 16 kHz PCM16，经 HTTP 发送至本机，不保存录音，不调用在线识别。
- 推理期间暂停收集新片段，避免积压；极短间隔的连续口令可能漏掉。噪声较大或讲话很轻时，当前音量阈值分句可能不理想，需要用现场麦克风验证。
- 播报时沿用原有逻辑暂停关键词监听，避免自身播报触发。服务不可用时提示启动服务，不回退在线识别。
- 页面需通过 localhost 或 HTTPS 使用麦克风；浏览器可能要求允许访问本地网络。
- 断网使用时，网页和 ASR 均应由本机启动，并提前在小安设置中选择好音频并保存。

## 验证

```powershell
./local-asr/.venv/Scripts/python.exe local-asr/test_server.py
npm test
npm run build
```

`GET /health` 返回模型状态。`POST /recognize` 接收 `application/octet-stream`，格式为 16 kHz 单声道小端 PCM16，长度 0.1–12 秒，返回 `text` 和 `elapsedMs`。
