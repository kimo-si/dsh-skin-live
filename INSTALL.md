# 手工安装 / 本地 link 调试

插件管理器（[README 的安装一节](README.md#安装)）已经覆盖了正常安装路径。这份文档留给两种情况：

- 你要在本机改代码，希望改完就生效（`link:` + 热加载）；
- 你从早期的 `@local/dsh-skin-live` 手工挂载版本迁移过来，需要把旧配置清干净。

## 1. 本地 link 安装

把仓库目录 link 进目标 profile（示例 profile 为 `web`）：

```bash
# 1) 依赖登记：在 profile 的 package.json 里加一条 link 依赖
#    ~/.dsh/profiles/web/package.json
"dependencies": {
  "dsh-skin-live": "link:/绝对路径/dsh-skin-live"
}

# 2) 让 pnpm 建立软链
cd ~/.dsh/profiles/web && pnpm install

# 3) 挂载：在 profile 的 cordis.patch.yml 末尾追加
#    ~/.dsh/profiles/web/cordis.patch.yml
- insert:
    - id: dsh-skin-live
      name: "dsh-skin-live"
```

该 profile 需要 `dsh.profile.patchReload: live`，patch 层才会热加载。改完浏览器刷新一次就能拿到新的 client bundle。

### 为什么不用 `dsh.profile.bundles`

把包名写进 `dsh.profile.bundles` 也会挂载同样的条目（走包内 `cordis.patch.yml`），但**两条路同时用会重复插入同一个 id**。手工调试选 patch 层，因为它支持热更新；如果改用官方 `install_bundle` 的写法（写入 bundles 列表），必须先删掉 patch 层里那 3 行。

### 验证

```bash
dsh --profile web --dump-config | grep -A2 'dsh-skin-live'
```

期望输出：

```yaml
- id: dsh-skin-live
  name: 'dsh-skin-live'
```

页面侧：刷新 <http://127.0.0.1:3080> → 设置 → 皮肤。

## 2. 从 `@local/dsh-skin-live` 迁移

1.0.0 把包名从 `@local/dsh-skin-live` 改成 `dsh-skin-live`（公开发布需要）。插件会自己沿用旧数据：

- 旧键 `@local/dsh-skin-live:settings:v1` 里的参数会被读出并写入 `dsh-skin-live:settings:v1`；
- 旧库 `@local/dsh-skin-live:media` 里的素材会被复制到 `dsh-skin-live:media` 后照常显示。

旧数据不会被删除，方便回退。需要清理的是**旧的手工挂载项**：

```bash
# 1) 删掉 profile cordis.patch.yml 末尾那 3 行 insert（id: dsh-skin-live / name: "@local/dsh-skin-live"）
# 2) 删掉 profile package.json 里的 "@local/dsh-skin-live" 依赖行
# 3) 可选：移除软链
rm -f ~/.dsh/profiles/web/node_modules/@local/dsh-skin-live
# 4) 重新安装
dsh plugin --profile web add /绝对路径/dsh-skin-live
```

两条路同时存在会因为 id 重复而报错，所以第 1、2 步必须做。

## 3. 回滚

本仓库根目录之外的 profile 原件备份在 `../.dsh-backup/<日期>/`，可直接覆盖回去。回滚后重启 dsh（或等热加载）即可恢复旧行为。

## 4. 已知问题记录

### 2026-10-14：背景不可见

插件原先只声明 `slots` 服务依赖，可能在 `theme` 尚未就绪时执行，把 `undefined` 存进背景控制器。此时视频能播放，但应用基础背景没有透明化，素材被遮住。

修复：客户端服务依赖补齐为 `slots`、`theme`、`locale`，等服务就绪后再挂载背景。没有修改布局、尺寸、间距或现有 CSS。

回归测试覆盖服务晚到、视频恢复、背景开关、主题切换和卸载清理。

### 2026-10-14：侧栏背景不一致

侧栏底色原先受「面板不透明度」控制，仍会叠加当前主题的绿色底色。

修复：皮肤启用时把侧栏底色也设为透明，与主区域共用全局背景；卡片、输入框与弹层仍沿用原有透明度设置，布局和文字样式未修改。

## 5. 与 skin-center 的关系

`~/.dsh/skins/` + `~/.dsh/skin-center-active.json`（激活 mint）属于 `@linxin666/dsh-client-ui-skin-center` 那套皮肤系统。两者同时生效会互相覆盖背景与 token，建议只留一套。
