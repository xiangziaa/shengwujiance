# 源素材

`xiaoan/standing.png` 和 `xiaoan/prompt.md` 是当前数字人形象的原始图片与生成记录。
它们不进入前端构建产物。网站实际使用的透明 WebP 和口型贴图位于 `frontend/public/`。

需要重新处理数字人素材时，在仓库根目录运行：

```powershell
python frontend/scripts/prepare_xiaoan.py
```

脚本需要 Python、Pillow、NumPy 和 OpenCV；常规开发和构建不需要这些依赖。
透明图与口型贴图写入 `frontend/public/`，预览写入被 Git 忽略的 `output/xiaoan/`。
