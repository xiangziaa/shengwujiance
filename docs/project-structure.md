# 项目结构整理记录

整理日期：2026-09-17。

## 命名

中文产品名继续使用“粮安智检”，英文项目名为 `grain-safety-intelligence`，前端包名为 `grain-safety-intelligence-web`。拼音可以作为内部代号；仓库和软件包采用表达业务含义的英文小写短横线名称，更方便理解。

当前工作区外层目录 `D:\work\shengwujiance` 保留，避免改变编辑器的活动工作区路径。关闭工作区和开发服务后可手动重命名为 `grain-safety-intelligence`；项目脚本不依赖原目录名。

## 目录调整

| 原位置 | 新位置或处理 |
| --- | --- |
| `code/` | `frontend/` |
| 当前数字人的原始 PNG 与提示词 | `assets/source/xiaoan/` |
| 运行时透明 WebP 和口型贴图 | 保留在 `frontend/public/` |
| 素材处理预览 | 以后生成到 `output/xiaoan/` |
| 根目录运行入口 | 新增 `package.json`，转发到前端命令 |
| Nginx 参考配置 | `deploy/nginx/site.conf.example` |
| 本地历史发布包 | 已删除，发布时按需重新构建 |

以下文件已移出工作区，保存在清理备份中：

- 不兼容的依赖备份、npm 缓存、旧构建产物和日志。
- 旧的 `code.zip`、历史发布包和空的 `.htaccess` 文件。
- 未被当前应用使用的独立 Live2D 参考项目、撤回的固定语音实现。
- 旧 UI 图片、历史数字人图片、生成过程文件和过时的 Nginx 配置参考。

仍在使用的 `frontend/node_modules/` 保留，以便继续本地开发；构建后新生成的 `frontend/dist/` 也只保存在本地。

## 备份与恢复

本次备份目录：

```text
D:\work\grain-safety-intelligence-cleanup-backup-20260917-215034\
  before-cleanup.zip           整理前源码、素材、文档和配置快照
  removed-files/              移出的旧文件及目录
  git-index.before-cleanup    原 Git 索引备份
```

压缩备份已完成完整性检查。批量递归删除被自动审批策略拦截，因此实际采用移出归档：工作区已清理，但磁盘中的归档仍保留。恢复文件时应先检查是否会覆盖新的源码或配置。

Git 原暂存区包含约 5 万个依赖和缓存文件。首次上传前已同步目录迁移并重新暂存最新源码；依赖、缓存、构建、发布包及本机部署记录均已排除。

## 开发与部署

在仓库根目录使用：

```powershell
npm run setup
npm run dev
npm test
npm run build
```

根目录只提供统一命令，前端依赖与锁定文件均位于 `frontend/`。不要在根目录添加前端业务依赖。

现有线上发布目录、Nginx 配置名、证书名和续期定时器保持原值。新模板仅供新环境参考，不应直接覆盖生产配置。后续发布使用 `frontend/dist/`，需要打包时可临时创建被忽略的 `deploy/releases/`，上传后清理本地发布包；部署记录写入 `deploy/latest-deployment.json`。

`deploy/` 当前仅保留 Nginx 配置模板和最近一次部署记录。两个本地历史发布包及空的 `releases/` 目录已删除，释放约 10.7 MiB；服务器上的版本和回滚备份未改动。

本次整理后已通过 TypeScript 编译、Vite 生产构建以及语音和日期回归测试。
