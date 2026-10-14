# 更新记录

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-10-14

首个公开版本。

### 功能

- 全局背景层：一张图片（PNG / JPG / JPEG / WebP / GIF / AVIF / BMP / SVG）或一段视频（MP4 / WebM / OGV / MOV / M4V / MKV）铺满整个 DSH Web 界面，主区域与侧栏共用同一背景。
- 背景来源支持本地文件（存 `IndexedDB`）与远程 URL。
- 四项独立调节：面板不透明度（0–100%）、素材不透明度（10–100%）、模糊（0–40px）、暗化（0–80%）。
- 铺满方式支持 cover / contain / fill。
- 参数写入 `localStorage`，刷新与重启后自动恢复；全部本地运行，无网络请求。
- 停用或卸载插件后移除背景层、还原主题变量、释放对象 URL。

### 兼容性

- 在 DSH `0.2.0-rc.2` + Web / PWA 上实测通过；Desktop profile 未验证。
- 不声明 `peerDependencies`，避免运行时升级造成版本互斥拒绝安装；客户端服务缺失时降级为无背景。

### 变更

- 包名由本机专用的 `@local/dsh-skin-live` 改为公开发布名 `dsh-skin-live`，补齐 `license`、`repository`、`homepage`、`keywords`、`engines` 等清单字段。
- 新增存储迁移：旧名 `@local/dsh-skin-live` 下的参数与素材会被沿用并复制到新名下，旧数据不删除。
- 新增两条迁移回归，测试总数 7 → 9。
