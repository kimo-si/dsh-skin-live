# dsh-skin-live

<p align="center">
  <img src="icon.svg" width="88" height="88" alt="dsh-skin-live">
</p>

把一张图片或一段视频铺满整个 DSH Web 界面 —— **只改背景，不动布局**。

插件在页面最底层挂一个固定画布，把应用本身的底色透明化，于是主区域和侧栏共用同一张背景；卡片、输入框、弹层仍留在原位置、原尺寸，只是变成了半透明玻璃。所有参数存在浏览器本地，素材不上传、不联网。

- 图片：`PNG` `JPG` `JPEG` `WebP` `GIF` `AVIF` `BMP` `SVG`
- 视频：`MP4` `WebM` `OGV` `MOV` `M4V` `MKV`（静音、循环、自动播放）
- 也可以直接填一个图片 / 视频 URL，素材不用下载到本地
- 四项独立调节：面板不透明度、素材不透明度、模糊、暗化
- 停用或卸载插件后，背景层被移除、主题变量还原，界面回到默认外观

## 目录

- [安装](#安装)
- [使用](#使用)
- [参数说明](#参数说明)
- [兼容范围](#兼容范围)
- [卸载与回滚](#卸载与回滚)
- [数据与隐私](#数据与隐私)
- [与其它皮肤插件共存](#与其它皮肤插件共存)
- [本地开发](#本地开发)
- [许可](#许可)

## 安装

DSH 自带插件管理器，三种来源都支持。**任选一种即可，不需要手改配置文件。**

### 方式一：Web 插件页（推荐，不用命令行）

1. 打开 DSH Web 界面（默认 <http://127.0.0.1:3080>）。
2. 左侧栏进入 **插件**（Plugins）页。
3. 在安装输入框里粘贴下面这一行，确认安装：

   ```
   github:zhaochaorui-study/dsh-skin-live
   ```

4. 安装完成后插件会默认启用；如果列表里显示未启用，手动打开它的开关。
5. 刷新页面（`Cmd/Ctrl + R`），设置里就会出现「皮肤」。

### 方式二：命令行

```bash
dsh plugin --profile web add github:zhaochaorui-study/dsh-skin-live
```

发布到 npm 之后，也可以直接用包名：

```bash
dsh plugin --profile web add dsh-skin-live
```

> `--profile web` 是目标 profile 名。桌面版换用 `--profile desktop`（尚未验证）。

### 方式三：离线安装包 `.tgz`

不想联网或想固定版本时，从 [Releases](https://github.com/zhaochaorui-study/dsh-skin-live/releases) 下载 `dsh-skin-live-1.0.0.tgz`，然后：

```bash
dsh plugin --profile web add /绝对路径/dsh-skin-live-1.0.0.tgz
```

也可以在插件页选择这个本地文件安装。

### 验证安装

```bash
dsh plugin --profile web list | grep dsh-skin-live
dsh --profile web --dump-config | grep -A2 'dsh-skin-live'
```

预期能看到 `dsh-skin-live` 这一条依赖，以及一个 `id: dsh-skin-live` 的加载项。

## 使用

界面里的路径是 **设置 → 皮肤**。

1. **选择背景** —— 点「选择文件」上传，或把图片 / 视频直接拖进虚线框；也可以在输入框里粘贴素材 URL。
2. **调节参数** —— 按下面的表格拖动滑块，画面实时变化。
3. **自动保存** —— 参数写入 `localStorage`，素材写入 `IndexedDB`，刷新或重启 DSH 后自动恢复。

首版的完整流程就是这三步：**安装插件 → 选择背景 → 调整模糊和暗化**。

## 参数说明

| 控件 | 范围 | 作用 |
| --- | --- | --- |
| 启用皮肤 | 开 / 关 | 临时关掉背景层并还原主题，素材和参数都保留，随时开回来 |
| 背景来源 | 文件 / URL | 本地文件存进 `IndexedDB`；URL 每次加载时直接引用 |
| 铺满方式 | 铺满 / 完整 / 拉伸 | 对应 `object-fit: cover / contain / fill` |
| 面板不透明度 | 0–100% | 只作用于卡片、输入框、弹层等面板表面；0% 为全透明，100% 为当前主题原色 |
| 素材不透明度 | 10–100% | 背景图片 / 视频本身的透明度 |
| 模糊 | 0–40px | 只模糊背景层，文字保持清晰（模糊时自动放大 6% 避免边缘露白） |
| 暗化 | 0–80% | 在背景上叠一层黑色蒙版，深色主题下更好读 |

侧栏属于全局背景画布，所以它跟随背景显示；「面板不透明度」不会把它单独盖掉。

## 兼容范围

| 环境 | 状态 |
| --- | --- |
| DSH `0.2.0-rc.2` + Web / PWA | ✅ 已实测 |
| DSH Desktop（`--profile desktop`） | ⚠️ 未验证，按需自行确认 |
| 更早的 DSH 版本 | 未验证；插件依赖 `slots` / `theme` / `locale` 三个客户端服务 |

实现上刻意**不声明 `peerDependencies`**，避免 DSH 运行时升级后出现版本互斥拒绝安装；服务缺失或接口变化时，插件会退化为无背景，不会影响主界面正常使用。

主题相关的实现依赖 DSH 的主题服务（`theme.overrideTokens`）、调色板变量（`--dsw-alias-*`、`--dsw-specific-*`）和插槽 / 语言服务，DSH 升级后如果变量被重命名，面板不透明度会回落到主题默认值（不会出现错误颜色）。

## 卸载与回滚

**停用（保留数据）**：插件页关掉开关，或在设置里关掉「启用皮肤」——背景立刻还原，参数和素材都还在。

**彻底卸载**：

```bash
dsh plugin --profile web remove dsh-skin-live
```

然后在插件页确认它已从列表消失，刷新页面。卸载后 `localStorage` / `IndexedDB` 里的参数与素材可以手动清理：

```js
// 浏览器开发者工具 Console
localStorage.removeItem('dsh-skin-live:settings:v1');
indexedDB.deleteDatabase('dsh-skin-live:media');
```

## 数据与隐私

- 参数：`localStorage` 键 `dsh-skin-live:settings:v1`
- 素材：`IndexedDB` 库 `dsh-skin-live:media`，对象仓库 `blobs`，键 `current`
- 插件不发起任何网络请求，也不上报数据。填 URL 时，素材由浏览器按该地址直接加载。

从早期本地版 `@local/dsh-skin-live` 升级过来时，旧键 `@local/dsh-skin-live:settings:v1` 和旧库 `@local/dsh-skin-live:media` 里的内容会被自动沿用并复制一份到新名字下；旧数据不会被删除，方便回退到旧版本。

## 与其它皮肤插件共存

如果同时装了另一套皮肤系统（例如 `@linxin666/dsh-client-ui-skin-center`），两边都会改写背景和主题变量，会互相覆盖。建议只保留一套。

## 本地开发

仓库结构：

```
.
├── package.json        # dsh 清单：bundle patch、client 入口、注入的客户端服务
├── index.js            # Host 半边：只提供 Loader 条目，不做事
├── client.js           # Client 半边：背景层、主题 token、设置页（全部逻辑）
├── client.test.js      # 回归测试（node:test + 最小 DOM/IndexedDB 夹具）
├── cordis.patch.yml    # 插件挂载声明
├── locale/             # 设置页文案
└── icon.svg            # 插件图标
```

跑检查：

```bash
npm run check   # 两个入口的语法检查
npm test        # 9 项回归测试
npm pack        # 产出可安装的 .tgz
```

手工 link 到本机 profile 调试、以及从旧版本迁移本机配置的完整步骤，见 [INSTALL.md](INSTALL.md)。

### 设计取舍

- 背景层是 `position: fixed; z-index: -1` 且 `pointer-events: none` 的独立节点，挂在 `document.body` 上 —— 这是既能垫在整个应用之下、又不影响页面原有布局的唯一位置。
- 面板半透明走主题变量覆盖（`theme.overrideTokens`），逐个 token 读取当前主题的真实色值再混入透明度；主题没定义的 token 直接跳过，而不是猜一个颜色。
- 所有副作用都挂在 `ctx.effect` 上，插件卸载时移除 DOM、撤销 token 覆盖、释放对象 URL。
- 插件本体很轻（几十 KB），不带任何素材；皮肤素材由用户自己提供，因此安装包可以保持小体积。

## 许可

[MIT](LICENSE)
