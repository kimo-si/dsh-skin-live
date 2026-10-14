# dsh-skin-live

<p align="center">
  <img src="icon.svg" width="88" height="88" alt="dsh-skin-live">
</p>

Fill the whole DSH Web interface with one image or video — **the background changes, the layout does not**.

The plugin appends a fixed layer at the very bottom of the page and makes the app's own surfaces transparent, so the main area and the sidebar share a single backdrop. Cards, the composer and popovers stay exactly where they were, only turning into translucent glass. Everything is stored locally in the browser: nothing is uploaded, nothing is fetched.

- Images: `PNG` `JPG` `JPEG` `WebP` `GIF` `AVIF` `BMP` `SVG`
- Video: `MP4` `WebM` `OGV` `MOV` `M4V` `MKV` (muted, looping, autoplay)
- Or point at an image / video URL instead of storing the file locally
- Four independent controls: panel opacity, media opacity, blur, dim
- Disabling or removing the plugin takes the layer away and restores the theme

## Table of contents

- [Install](#install)
- [Use](#use)
- [Controls](#controls)
- [Compatibility](#compatibility)
- [Uninstall](#uninstall)
- [Data and privacy](#data-and-privacy)
- [Other skin plugins](#other-skin-plugins)
- [Development](#development)
- [License](#license)

## Install

DSH ships a plugin manager that accepts three kinds of source. **Pick one — no config editing needed.**

### 1. Web plugin page (recommended)

1. Open the DSH Web GUI (default <http://127.0.0.1:3080>).
2. Open the **Plugins** page in the sidebar.
3. Paste this spec into the install field and confirm:

   ```
   github:zhaochaorui-study/dsh-skin-live
   ```

4. The plugin is enabled by default once installed; switch it on if the list shows it disabled.
5. Reload the page (`Cmd/Ctrl + R`). A **Skin** section appears in Settings.

### 2. Command line

```bash
dsh plugin --profile web add github:zhaochaorui-study/dsh-skin-live
```

Once published to npm, the package name works too:

```bash
dsh plugin --profile web add dsh-skin-live
```

> `--profile web` names the target profile. The Desktop app would use `--profile desktop` (unverified).

### 3. Offline `.tgz`

Grab `dsh-skin-live-1.0.0.tgz` from [Releases](https://github.com/zhaochaorui-study/dsh-skin-live/releases), then:

```bash
dsh plugin --profile web add /absolute/path/dsh-skin-live-1.0.0.tgz
```

The plugin page can install that local file as well.

### Verify

```bash
dsh plugin --profile web list | grep dsh-skin-live
dsh --profile web --dump-config | grep -A2 'dsh-skin-live'
```

You should see the `dsh-skin-live` dependency and a loader entry with `id: dsh-skin-live`.

## Use

In the GUI: **Settings → Skin**.

1. **Choose a background** — click to pick a file, drop an image or video onto the dashed area, or paste a media URL.
2. **Tune it** — drag the sliders; the page updates live.
3. **It saves itself** — settings go to `localStorage`, media goes to `IndexedDB`, and both are restored after a reload or restart.

## Controls

| Control | Range | Effect |
| --- | --- | --- |
| Enable skin | on / off | Takes the layer away and restores the theme; keeps the media and settings |
| Source | file / URL | Files are stored in `IndexedDB`; a URL is referenced directly on every load |
| Fit | cover / contain / fill | Maps to `object-fit` |
| Panel opacity | 0–100% | Only panel surfaces (cards, composer, popovers): 0% fully transparent, 100% the theme's own color |
| Media opacity | 10–100% | Opacity of the background image / video itself |
| Blur | 0–40px | Blurs the backdrop only, text stays crisp (scaled 6% while blurred to hide the edges) |
| Dim | 0–80% | Black scrim over the backdrop; helps readability on dark themes |

The sidebar is part of the global backdrop canvas, so it follows the same background instead of covering it.

## Compatibility

| Environment | Status |
| --- | --- |
| DSH `0.2.0-rc.2` + Web / PWA | ✅ tested |
| DSH Desktop (`--profile desktop`) | ⚠️ unverified |
| Older DSH versions | unverified; the client half needs the `slots`, `theme` and `locale` services |

The package deliberately declares **no `peerDependencies`**, so a DSH runtime upgrade cannot refuse the install over a version range. If a service is missing or its interface changes, the plugin degrades to "no background" and leaves the GUI usable.

The theme integration relies on `theme.overrideTokens`, the `--dsw-alias-*` / `--dsw-specific-*` palette tokens and the slots / locale services. If an upgrade renames a token, panel opacity falls back to the theme default rather than to a wrong color.

## Uninstall

**Disable (keeps data):** switch the plugin off, or turn off *Enable skin* in Settings.

**Remove:**

```bash
dsh plugin --profile web remove dsh-skin-live
```

Then confirm it left the plugin list and reload. Local data can be cleared from the browser console:

```js
localStorage.removeItem('dsh-skin-live:settings:v1');
indexedDB.deleteDatabase('dsh-skin-live:media');
```

## Data and privacy

- Settings: `localStorage` key `dsh-skin-live:settings:v1`
- Media: `IndexedDB` database `dsh-skin-live:media`, store `blobs`, key `current`
- No network requests, no telemetry. A URL source is loaded by the browser from that address.

Upgrading from the early local-link build `@local/dsh-skin-live` adopts the settings in `@local/dsh-skin-live:settings:v1` and copies the media out of `@local/dsh-skin-live:media`. The old copies are left untouched so a downgrade still works.

## Other skin plugins

Another skin system (for example `@linxin666/dsh-client-ui-skin-center`) rewrites the same background and theme tokens. Keep one, not both.

## Development

```
.
├── package.json        # dsh manifest: bundle patch, client entry, injected services
├── index.js            # Host half: a loader row that does nothing
├── client.js           # Client half: media layer, theme tokens, settings page
├── client.test.js      # node:test regressions with minimal DOM / IndexedDB fixtures
├── cordis.patch.yml    # mount declaration
├── locale/             # settings copy
└── icon.svg            # plugin icon
```

```bash
npm run check   # syntax check both entries
npm test        # 9 regressions
npm pack        # build the installable .tgz
```

See [INSTALL.md](INSTALL.md) for the manual `link:` setup and migration steps.

## License

[MIT](LICENSE)
