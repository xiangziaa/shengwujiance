# 小安中文女声选型

当前机器：RTX 4060 Laptop 8 GB，内存 32 GB。Qwen 使用显卡，其余已测试模型使用 CPU 推理。

| 模型 | 中文女声和特点 | 当前状态 |
| --- | --- | --- |
| Kokoro 82M v1.1-zh | 新增专业中文数据；55 个中文女声；小模型可 CPU 离线运行 | 已测试；正式列表只保留女声 01 作清亮备选 |
| MeloTTS zh_en | 单中文女声，支持中英混读 | 保留为“小安 · 标准播报”备选 |
| Matcha icefall zh-baker | 单中文女声，中文专用，合成快 | 已生成评估样音；标贝数据非商业限制，未上架到小安 |
| Qwen3-TTS 12Hz 1.7B CustomVoice | Vivian、Serena 中文女声，支持系统播报风格指令 | 已部署并生成样音；耗时 13～21 秒，峰值分配显存约 4.08 GB；GPU 服务就绪后提供试用 |
| ZipVoice-Distill INT8 | 使用已有合成女声作参考，CPU 离线运行 | 两条试用声线已接入，样音生成约 2 秒 |
| Fun-CosyVoice3 0.5B | 中文及多方言、发音修正、参考音色克隆；适合定制长期固定的女声 | 未部署，需要参考音色和更多依赖适配，未实测 |

Kokoro 的女声编号对应导出模型的 speaker ID 3～57，不是微软在线语音包，也不使用微软在线服务。当前默认声线为 Qwen Vivian，Kokoro 女声 01 为常规备选；新增 Qwen 和 ZipVoice 试用声线，详见 [NEW-ASSISTANT-MODELS.md](NEW-ASSISTANT-MODELS.md)。Piper 已从列表移除。

## 实测样音

打开 `../output/tts-comparison/index.html` 比较 9 段本机实际生成的 WAV。
统一文本为：您好，我是小安。检测结果已经更新，四号样品需要复核。请注意，黄曲霉毒素含量超过限值，请及时核对数据，并跟进处置流程。

Kokoro：约 2.8～3.4 秒生成 12.8～14.9 秒音频；MeloTTS：约 1.9 秒生成 10.8 秒；Matcha：约 0.4 秒生成 12.3 秒。
此数据不包含模型加载时间，不代表 GPU 性能，也不代表音质评分。详细原始结果在 `output/tts-comparison/results.json`。

## 官方资料

- Kokoro 中文模型说明与 Apache-2.0 许可：https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh
- Kokoro 中文女声 speaker ID 说明：https://github.com/k2-fsa/sherpa-onnx/pull/1942
- MeloTTS 中文中英混读与 MIT 许可：https://github.com/myshell-ai/MeloTTS
- Matcha 中文女声及非商业训练数据提示：https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/matcha.html
- Qwen3-TTS 0.6B 预设女声与 Apache-2.0 许可：https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice
- CosyVoice3 功能与部署：https://github.com/FunAudioLLM/CosyVoice


## 按系统助手场景收敛

早期选择 MeloTTS（标准播报）与 Kokoro ID 3（清亮播报）；用户试听后现已选择 Qwen Vivian 为默认，并预生成本地文件。不加气声、陪伴口吻、戏剧化情绪或额外音效；预警保持同一声线，使用既有警报提示区分。用户全局语速不变。

三类文本由 `assistant_scenarios.py` 在本机重新合成，原始结果和 WAV 位于 `output/assistant-voices/`。
MeloTTS 音高中位数约 238～259 Hz，中心 80% 音高跨度约 3.8～5.0 半音；Kokoro 备选约 267 Hz、5.8～6.8 半音。
这是有声帧自相关估计的辅助指标，可能含估计误差，不能代替听评，也不能证明专业术语或数字读音完全准确。
选择依据是减少声线选择负担、同一助手身份和较克制的韵律；未声称已完成主观听感评审。后续可通过同文样音确认用户偏好。
