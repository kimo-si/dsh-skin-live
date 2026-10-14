/**
 * dsh-skin-live — Client half.
 *
 * Global skin layer for the dsh Web GUI:
 *   - one full-viewport PNG/JPG/WebP/GIF or MP4/WebM skin behind every column;
 *   - the app's own base surfaces stay transparent, so the skin fills the frame;
 *   - a single "panel opacity" control drives the panel/surface theme tokens,
 *     turning cards, the composer and popovers into translucent glass.
 *
 * The media layer is a fixed, non-interactive element at `z-index: -1` appended to
 * `document.body` — the only placement that paints under the app root while leaving
 * the page's own layout untouched. It is owned by `ctx.effect`, so unloading the
 * plugin removes it, restores the theme tokens and revokes the object URL.
 */
window.__ModuleLoader__.load({
  id: 'dsh-skin-live',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Package identity: locale namespace, token-layer source, storage keys, marker attributes. */
    const PKG = 'dsh-skin-live';
    /**
     * Identity used before 1.0.0, when this plugin was an unpublished local link
     * package. Existing settings and media are adopted once under the new name,
     * and the old copies are left in place, so an install that upgrades keeps its
     * background and a downgrade still finds its own data.
     */
    const LEGACY_PKG = '@local/dsh-skin-live';
    const STORAGE_KEY = PKG + ':settings:v1';
    const LEGACY_STORAGE_KEY = LEGACY_PKG + ':settings:v1';
    const IDB_NAME = PKG + ':media';
    const LEGACY_IDB_NAME = LEGACY_PKG + ':media';
    const IDB_STORE = 'blobs';
    const IDB_KEY = 'current';
    const LAYER_ATTR = 'data-dsh-skin-live-layer';
    const ROOT_ATTR = 'data-dsh-skin-live';

    /**
     * Panel surfaces made translucent by the panel-opacity control. A token the
     * active theme does not define is skipped instead of guessed, so a renamed
     * token degrades to the theme default rather than to a wrong color.
     */
    const PANEL_TOKENS = [
      '--dsw-alias-bg-layer-1',
      '--dsw-alias-bg-layer-2',
      '--dsw-alias-bg-layer-3',
      '--dsw-alias-bg-overlay',
      '--dsw-alias-bg-module-platform',
      '--dsw-specific-input-major',
      '--dsw-specific-bubble',
      '--dsw-specific-selector',
    ];

    const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp', 'svg'];
    const VIDEO_EXT = ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv'];
    const SAFE_PROTOCOLS = ['http:', 'https:', 'data:', 'blob:'];

    const DEFAULT_SETTINGS = {
      enabled: true,
      source: 'none',
      url: '',
      fileName: '',
      fit: 'cover',
      panelOpacity: 55,
      mediaOpacity: 100,
      mediaBlur: 0,
      dim: 0,
    };

    const CSS_TEXT = [
      'html[' + ROOT_ATTR + '] body,',
      'html[' + ROOT_ATTR + '] #root {',
      '  background-color: transparent !important;',
      '  background-image: none !important;',
      '}',
      '.dsh-skin-live-page { display: flex; flex-direction: column; }',
      '.dsh-skin-live-intro { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; padding: 12px 0 4px; }',
      '.dsh-skin-live-row { display: flex; align-items: center; gap: 16px; padding: 16px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2); }',
      '.dsh-skin-live-row:last-child { border-bottom: none; }',
      '.dsh-skin-live-rowText { display: flex; flex: 1 1 auto; min-width: 0; flex-direction: column; gap: 4px; padding-right: 24px; }',
      '.dsh-skin-live-title { color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 22px; }',
      '.dsh-skin-live-desc { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }',
      '.dsh-skin-live-control { display: inline-flex; align-items: center; gap: 8px; flex: none; }',
      '.dsh-skin-live-stack { display: flex; flex-direction: column; gap: 8px; width: 284px; max-width: 42vw; }',
      '.dsh-skin-live-inline { display: flex; align-items: center; gap: 8px; }',
      '.dsh-skin-live-slider { width: 148px; accent-color: var(--dsw-alias-brand-primary); }',
      '.dsh-skin-live-value { min-width: 46px; text-align: right; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-secondary); font-size: 13px; }',
      '.dsh-skin-live-btn { font: inherit; font-size: 13px; height: 32px; padding: 0 12px; border: none; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.dsh-skin-live-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      '.dsh-skin-live-btn[data-variant="quiet"] { background: transparent; color: var(--dsw-alias-label-secondary); }',
      '.dsh-skin-live-btn[data-variant="quiet"]:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
      '.dsh-skin-live-input { font: inherit; font-size: 13px; height: 32px; flex: 1 1 auto; min-width: 0; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }',
      '.dsh-skin-live-input::placeholder { color: var(--dsw-alias-label-caption); }',
      '.dsh-skin-live-drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 16px; border: 1px dashed var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 20px; cursor: pointer; text-align: center; }',
      '.dsh-skin-live-drop[data-over="true"] { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }',
      '.dsh-skin-live-dropHint { color: var(--dsw-alias-label-caption); font-size: 12px; }',
      '.dsh-skin-live-segmented { display: inline-flex; gap: 2px; padding: 2px; background: var(--dsw-alias-bg-module-platform); border-radius: var(--dsw-radius-sm); }',
      '.dsh-skin-live-seg { font: inherit; font-size: 13px; height: 26px; padding: 0 12px; border: none; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }',
      '.dsh-skin-live-seg[data-active="true"] { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }',
      '.dsh-skin-live-switch { position: relative; width: 40px; height: 22px; padding: 0; border: none; border-radius: 999px; background: var(--dsw-alias-state-idle-primary); cursor: pointer; transition: background .2s ease; }',
      '.dsh-skin-live-switch[aria-checked="true"] { background: var(--dsw-alias-brand-primary); }',
      '.dsh-skin-live-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: var(--dsw-alias-switch-thumb); transition: transform .2s ease; }',
      '.dsh-skin-live-switch[aria-checked="true"] .dsh-skin-live-knob { transform: translateX(18px); }',
      '.dsh-skin-live-status { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; word-break: break-all; }',
      '.dsh-skin-live-error { color: var(--dsw-alias-state-error-primary); font-size: 12px; line-height: 18px; word-break: break-all; }',
    ].join('\n');

    /* ------------------------------------------------------------------ locale */

    const ZH = {
      'section.title': '皮肤',
      'intro': '用图片或视频铺满整个界面，面板保持半透明，皮肤覆盖全局。',
      'enable.title': '启用皮肤',
      'enable.desc': '关闭后立即恢复默认界面，已保存的素材仍然保留。',
      'source.title': '皮肤素材',
      'source.desc': '支持 PNG / JPG / WebP / GIF 与 MP4 / WebM，文件保存在本机浏览器中。',
      'source.drop': '拖入图片或视频，或点击选择',
      'source.dropHint': 'MP4 / WebM / PNG / JPG / WebP / GIF',
      'source.urlPlaceholder': '或粘贴图片 / 视频地址',
      'source.apply': '应用地址',
      'source.clear': '清除皮肤',
      'source.current': '当前素材：',
      'source.none': '尚未选择',
      'source.pick': '选择文件',
      'fit.title': '铺满方式',
      'fit.desc': '铺满会裁切边缘，适应会留出边距，拉伸会改变比例。',
      'fit.cover': '铺满',
      'fit.contain': '适应',
      'fit.fill': '拉伸',
      'panelOpacity.title': '面板不透明度',
      'panelOpacity.desc': '控制卡片、输入框与弹层的透明程度；侧栏共用全局背景。',
      'mediaOpacity.title': '皮肤不透明度',
      'mediaOpacity.desc': '控制背景图或视频自身的浓淡。',
      'mediaBlur.title': '皮肤模糊',
      'mediaBlur.desc': '让背景更柔和，面板上的文字更容易阅读。',
      'dim.title': '画面暗化',
      'dim.desc': '压暗背景亮度，适合高亮素材。',
      'error.unsupported': '不支持的文件类型，请选择图片或视频。',
      'error.store': '文件保存失败（浏览器存储不可用），本次会话内仍可使用。',
      'error.url': '地址无效，请填写 http(s) 图片或视频链接。',
      'error.media': '素材加载失败，请检查文件或地址。',
      'error.missing': '素材已丢失（浏览器存储被清理过），请重新选择文件。',
      'error.play': '素材已就位，但视频没有自动播放；点一下「启用皮肤」开关重试，或换用图片。',
    };

    const EN = {
      'section.title': 'Skin',
      'intro': 'Use an image or video as the backdrop of the whole interface; panels stay translucent so the skin fills the frame.',
      'enable.title': 'Enable skin',
      'enable.desc': 'Turning this off restores the default look and keeps the saved media.',
      'source.title': 'Skin media',
      'source.desc': 'PNG / JPG / WebP / GIF and MP4 / WebM are supported; files stay in this browser.',
      'source.drop': 'Drop an image or video here, or click to choose',
      'source.dropHint': 'MP4 / WebM / PNG / JPG / WebP / GIF',
      'source.urlPlaceholder': 'or paste an image / video URL',
      'source.apply': 'Apply URL',
      'source.clear': 'Clear skin',
      'source.current': 'Current media: ',
      'source.none': 'none yet',
      'source.pick': 'Choose file',
      'fit.title': 'Fit',
      'fit.desc': 'Cover crops the edges, contain leaves margins, fill stretches.',
      'fit.cover': 'Cover',
      'fit.contain': 'Contain',
      'fit.fill': 'Fill',
      'panelOpacity.title': 'Panel opacity',
      'panelOpacity.desc': 'Transparency of cards, composer and popovers; the sidebar shares the global backdrop.',
      'mediaOpacity.title': 'Skin opacity',
      'mediaOpacity.desc': 'Strength of the backdrop image or video itself.',
      'mediaBlur.title': 'Skin blur',
      'mediaBlur.desc': 'Softens the backdrop so panel text stays readable.',
      'dim.title': 'Dim',
      'dim.desc': 'Darkens the backdrop; useful for bright material.',
      'error.unsupported': 'Unsupported file type — choose an image or a video.',
      'error.store': 'Could not persist the file (browser storage unavailable); it still works this session.',
      'error.url': 'Invalid URL — use an http(s) image or video link.',
      'error.media': 'The media failed to load; check the file or URL.',
      'error.missing': 'The saved file is gone (browser storage was cleared); choose it again.',
      'error.play': 'The media is loaded but the video never started; toggle "Enable skin" to retry, or use an image.',
    };

    /* ------------------------------------------------------------------- store */

    const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

    function sanitize(raw) {
      const settings = Object.assign({}, DEFAULT_SETTINGS);
      if (raw === null || typeof raw !== 'object') return settings;
      if (typeof raw.enabled === 'boolean') settings.enabled = raw.enabled;
      if (raw.source === 'file' || raw.source === 'url' || raw.source === 'none') settings.source = raw.source;
      if (typeof raw.url === 'string') settings.url = raw.url;
      if (typeof raw.fileName === 'string') settings.fileName = raw.fileName;
      if (raw.fit === 'cover' || raw.fit === 'contain' || raw.fit === 'fill') settings.fit = raw.fit;
      settings.panelOpacity = clamp(raw.panelOpacity, 0, 100);
      settings.mediaOpacity = clamp(raw.mediaOpacity, 10, 100);
      settings.mediaBlur = clamp(raw.mediaBlur, 0, 40);
      settings.dim = clamp(raw.dim, 0, 80);
      return settings;
    }

    function readSettings(key) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? null : sanitize(JSON.parse(raw));
      } catch (error) {
        return null;
      }
    }

    function loadSettings() {
      const current = readSettings(STORAGE_KEY);
      if (current !== null) return current;
      const legacy = readSettings(LEGACY_STORAGE_KEY);
      if (legacy === null) return Object.assign({}, DEFAULT_SETTINGS);
      persist(legacy);
      return legacy;
    }

    function persist(settings) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        /* storage may be unavailable; the session keeps working */
      }
    }

    const state = {
      epoch: 0,
      settings: loadSettings(),
      media: { kind: null, url: null, name: '' },
      errorKey: '',
    };

    const listeners = new Set();

    function emit() {
      state.epoch += 1;
      for (const listener of Array.from(listeners)) {
        try {
          listener();
        } catch (error) {
          console.error('[' + PKG + '] listener failed', error);
        }
      }
    }

    function subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }

    function patchSettings(patch) {
      Object.assign(state.settings, patch);
      persist(state.settings);
      emit();
    }

    function fail(key) {
      state.errorKey = key;
      emit();
    }

    /* ---------------------------------------------------------- media plumbing */

    let objectUrl = null;

    function classifyFile(file) {
      const type = String(file.type || '').toLowerCase();
      if (type.indexOf('video/') === 0) return 'video';
      if (type.indexOf('image/') === 0) return 'image';
      const ext = String(file.name || '').split('.').pop().toLowerCase();
      if (VIDEO_EXT.indexOf(ext) >= 0) return 'video';
      if (IMAGE_EXT.indexOf(ext) >= 0) return 'image';
      return null;
    }

    function classifyUrl(url) {
      const clean = url.split('#')[0].split('?')[0].toLowerCase();
      const ext = clean.split('.').pop();
      if (VIDEO_EXT.indexOf(ext) >= 0) return 'video';
      if (IMAGE_EXT.indexOf(ext) >= 0) return 'image';
      return null;
    }

    /** Probe an extension-less URL: an image load failure means it is treated as a video. */
    function probeKind(url) {
      return new Promise((resolve) => {
        const known = classifyUrl(url);
        if (known !== null) {
          resolve(known);
          return;
        }
        const probe = new Image();
        let settled = false;
        const finish = (kind) => {
          if (settled) return;
          settled = true;
          probe.onload = null;
          probe.onerror = null;
          probe.src = '';
          resolve(kind);
        };
        probe.onload = () => finish('image');
        probe.onerror = () => finish('video');
        probe.src = url;
        window.setTimeout(() => finish('image'), 4000);
      });
    }

    function normalizeUrl(raw) {
      try {
        const parsed = new URL(raw, window.location.href);
        return SAFE_PROTOCOLS.indexOf(parsed.protocol) >= 0 ? parsed.href : null;
      } catch (error) {
        return null;
      }
    }

    function setMedia(kind, url, name) {
      if (objectUrl !== null && objectUrl !== url) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      state.errorKey = '';
      state.media = { kind, url, name: name || '' };
      emit();
    }

    function adoptBlob(blob, kind, name) {
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(blob);
      state.errorKey = '';
      state.media = { kind, url: objectUrl, name: name || '' };
      emit();
    }

    function idbOpen(name) {
      return new Promise((resolve, reject) => {
        const factory = window.indexedDB;
        if (factory === undefined || factory === null) {
          reject(new Error('IndexedDB unavailable'));
          return;
        }
        const database = name === undefined ? IDB_NAME : name;
        const request = factory.open(database, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('IndexedDB blocked'));
      });
    }

    async function idbPut(record) {
      try {
        const db = await idbOpen();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(record, IDB_KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
        db.close();
        return true;
      } catch (error) {
        console.error('[' + PKG + '] media store failed', error);
        return false;
      }
    }

    async function idbGet(name) {
      try {
        const db = await idbOpen(name);
        const record = await new Promise((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const request = tx.objectStore(IDB_STORE).get(IDB_KEY);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        db.close();
        return record === undefined ? null : record;
      } catch (error) {
        return null;
      }
    }

    /**
     * Adopt a media blob saved under the pre-1.0.0 package name. The copy is kept
     * rather than moved: writing into the new store can fail on its own (private
     * mode, quota), and the restored blob still has to paint either way.
     */
    async function idbAdoptLegacy() {
      const record = await idbGet(LEGACY_IDB_NAME);
      if (record === null || record === undefined || record.blob === undefined || record.blob === null) return null;
      await idbPut(record);
      return record;
    }

    async function idbClear(name) {
      try {
        const db = await idbOpen(name);
        await new Promise((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).delete(IDB_KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      } catch (error) {
        /* nothing to clear */
      }
    }

    async function acceptFile(file) {
      const kind = classifyFile(file);
      if (kind === null) {
        fail('error.unsupported');
        return;
      }
      const stored = await idbPut({ blob: file, kind, name: String(file.name || ''), type: String(file.type || '') });
      adoptBlob(file, kind, String(file.name || ''));
      patchSettings({ source: 'file', url: '', fileName: String(file.name || ''), enabled: true });
      if (!stored) fail('error.store');
    }

    async function acceptUrl(raw) {
      const value = String(raw || '').trim();
      if (value === '') {
        clearSkin();
        return;
      }
      const normalized = normalizeUrl(value);
      if (normalized === null) {
        fail('error.url');
        return;
      }
      patchSettings({ source: 'url', url: normalized, fileName: '', enabled: true });
      const kind = await probeKind(normalized);
      setMedia(kind, normalized, '');
    }

    async function restoreSavedMedia() {
      const settings = state.settings;
      if (settings.source === 'file') {
        let record = await idbGet(IDB_NAME);
        if (record === null || record === undefined) record = await idbAdoptLegacy();
        if (record !== null && record !== undefined && record.blob !== undefined && record.blob !== null) {
          adoptBlob(record.blob, record.kind === 'video' ? 'video' : 'image', record.name);
        } else {
          /* A name without a blob would otherwise leave the layer silently empty. */
          fail('error.missing');
        }
        return;
      }
      if (settings.source === 'url' && settings.url !== '') {
        const normalized = normalizeUrl(settings.url);
        if (normalized === null) return;
        const kind = await probeKind(normalized);
        setMedia(kind, normalized, '');
      }
    }

    function clearSkin() {
      if (objectUrl !== null) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      state.media = { kind: null, url: null, name: '' };
      state.errorKey = '';
      patchSettings({ source: 'none', url: '', fileName: '' });
      // Clearing is explicit, so the adopted pre-1.0.0 copy goes too.
      void idbClear(IDB_NAME);
      void idbClear(LEGACY_IDB_NAME);
    }

    /* ------------------------------------------------------------- media layer */

    /**
     * Own the under-everything media layer and the panel-opacity token layer.
     * Every entry point is idempotent, so store changes, theme changes and unload
     * can drive the same `sync`.
     */
    function createLayer(theme) {
      let root = null;
      let mediaEl = null;
      let scrim = null;
      let mediaKey = '';
      let tokenDisposer = null;
      let lastTokens = null;
      let palettes = null;
      let tokenKey = '';
      let paletteSignature = '';

      function themeSignature() {
        if (theme === undefined || theme === null || typeof theme.getTheme !== 'function') return 'none';
        const snapshot = theme.getTheme();
        if (snapshot === undefined || snapshot === null) return 'none';
        return String(snapshot.active.id) + ':' + String(snapshot.active.colorScheme);
      }

      /** Read one palette's token values, flipping the palette attribute synchronously. */
      function readPalette(dark) {
        const body = document.body;
        const hadDark = body.hasAttribute('data-ds-dark-theme');
        if (dark !== hadDark) body.toggleAttribute('data-ds-dark-theme', dark);
        const computed = window.getComputedStyle(body);
        const values = {};
        for (const name of PANEL_TOKENS) values[name] = computed.getPropertyValue(name).trim();
        if (dark !== hadDark) body.toggleAttribute('data-ds-dark-theme', hadDark);
        return values;
      }

      /** Retract our own layer, read both palettes, then restack it. */
      function readPalettes() {
        const held = tokenDisposer;
        tokenDisposer = null;
        if (held !== null) held();
        const light = readPalette(false);
        const dark = readPalette(true);
        if (lastTokens !== null && theme !== undefined && theme !== null) {
          tokenDisposer = theme.overrideTokens(PKG, lastTokens);
        }
        return { light, dark };
      }

      function mixColor(original, percent) {
        if (percent >= 100) return original;
        if (percent <= 0) return 'transparent';
        return 'color-mix(in srgb, ' + original + ' ' + String(percent) + '%, transparent)';
      }

      /** Stack (or retract) the token layer carrying base transparency and panel opacity. */
      function applyTokens(active) {
        const html = document.documentElement;
        if (!active) {
          if (tokenDisposer !== null) tokenDisposer();
          tokenDisposer = null;
          lastTokens = null;
          tokenKey = '';
          html.removeAttribute(ROOT_ATTR);
          return;
        }
        html.setAttribute(ROOT_ATTR, '');
        if (theme === undefined || theme === null || typeof theme.overrideTokens !== 'function') return;
        const signature = themeSignature();
        if (palettes === null || signature !== paletteSignature) {
          palettes = readPalettes();
          paletteSignature = signature;
        }
        const percent = clamp(state.settings.panelOpacity, 0, 100);
        // 全局画布与侧栏直接显示同一背景，避免面板底色覆盖整列。
        const tokens = {
          '--dsw-alias-bg-base': { light: 'transparent', dark: 'transparent' },
          '--dsw-specific-sidebar-fill': { light: 'transparent', dark: 'transparent' },
        };
        for (const name of PANEL_TOKENS) {
          const light = palettes.light[name];
          const dark = palettes.dark[name];
          if (!light || !dark) continue;
          tokens[name] = { light: mixColor(light, percent), dark: mixColor(dark, percent) };
        }
        lastTokens = tokens;
        const key = signature + '|' + String(percent);
        if (tokenDisposer !== null && key === tokenKey) return;
        tokenKey = key;
        tokenDisposer = theme.overrideTokens(PKG, tokens);
      }

      function buildMedia(kind, url, fit) {
        const element = document.createElement(kind === 'video' ? 'video' : 'img');
        element.setAttribute('aria-hidden', 'true');
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.display = 'block';
        element.style.objectFit = fit;
        element.style.objectPosition = 'center';
        if (kind === 'video') {
          element.muted = true;
          element.defaultMuted = true;
          element.loop = true;
          element.autoplay = true;
          element.preload = 'auto';
          element.playsInline = true;
          element.setAttribute('muted', '');
          element.setAttribute('playsinline', '');
          element.setAttribute('disablepictureinpicture', '');
          element.tabIndex = -1;
          element.addEventListener('error', () => fail('error.media'));
          element.addEventListener('loadeddata', () => {
            const played = element.play();
            if (played !== undefined && played !== null && typeof played.catch === 'function') {
              played.catch(() => fail('error.play'));
            }
          });
        } else {
          element.alt = '';
          element.draggable = false;
          element.addEventListener('error', () => fail('error.media'));
        }
        element.src = url;
        return element;
      }

      function detach() {
        if (root !== null) {
          root.remove();
          root = null;
          mediaEl = null;
          scrim = null;
          mediaKey = '';
        }
      }

      function sync() {
        const settings = state.settings;
        const active = settings.enabled === true && typeof state.media.url === 'string' && state.media.url !== '';
        applyTokens(active);
        if (!active) {
          detach();
          return;
        }
        if (root === null || !root.isConnected) {
          root = document.createElement('div');
          root.setAttribute(LAYER_ATTR, '');
          root.setAttribute('aria-hidden', 'true');
          root.style.position = 'fixed';
          root.style.inset = '0';
          root.style.zIndex = '-1';
          root.style.pointerEvents = 'none';
          root.style.overflow = 'hidden';
          root.style.background = 'transparent';
          scrim = document.createElement('div');
          scrim.style.position = 'absolute';
          scrim.style.inset = '0';
          scrim.style.pointerEvents = 'none';
          document.body.appendChild(root);
          mediaKey = '';
        }
        const key = String(state.media.kind) + ':' + state.media.url;
        if (key !== mediaKey || mediaEl === null || !mediaEl.isConnected) {
          mediaKey = key;
          root.replaceChildren();
          mediaEl = buildMedia(state.media.kind === 'video' ? 'video' : 'image', state.media.url, settings.fit);
          root.appendChild(mediaEl);
          root.appendChild(scrim);
        }
        mediaEl.style.objectFit = settings.fit;
        mediaEl.style.opacity = settings.mediaOpacity < 100 ? String(settings.mediaOpacity / 100) : '';
        mediaEl.style.filter = settings.mediaBlur > 0 ? 'blur(' + String(settings.mediaBlur) + 'px)' : '';
        mediaEl.style.transform = settings.mediaBlur > 0 ? 'scale(1.06)' : '';
        if (mediaEl.tagName === 'VIDEO' && mediaEl.paused) {
          const played = mediaEl.play();
          if (played !== undefined && played !== null && typeof played.catch === 'function') {
            played.catch((error) => {
              console.warn('[' + PKG + '] video did not start', error);
            });
          }
        }
        scrim.style.background = settings.dim > 0 ? 'rgba(0, 0, 0, ' + String(settings.dim / 100) + ')' : 'transparent';
      }

      /**
       * Re-read the palettes when the active theme (or its color scheme) changes.
       * The presenter publishes that change on documentElement/body attributes, so
       * the observer stays independent of cross-plugin event plumbing.
       */
      function watchTheme() {
        if (typeof MutationObserver !== 'function') return () => {};
        const observer = new MutationObserver(() => {
          const signature = themeSignature();
          if (signature === paletteSignature) return;
          palettes = null;
          tokenKey = '';
          sync();
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ds-theme-source'] });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] });
        return () => observer.disconnect();
      }

      function dispose() {
        detach();
        applyTokens(false);
        if (objectUrl !== null) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        palettes = null;
        paletteSignature = '';
        lastTokens = null;
      }

      return { sync, watchTheme, dispose };
    }

    /* ------------------------------------------------------------ shared hooks */

    const useEpoch =
      typeof React.useSyncExternalStore === 'function'
        ? () => React.useSyncExternalStore(subscribe, () => state.epoch, () => state.epoch)
        : () => {
            const [epoch, setEpoch] = React.useState(state.epoch);
            React.useEffect(() => subscribe(() => setEpoch(state.epoch)), []);
            return epoch;
          };

    function useLocaleTick(locale) {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        if (locale === undefined || locale === null || typeof locale.subscribe !== 'function') return undefined;
        return locale.subscribe(() => force((value) => value + 1));
      }, [locale]);
    }

    /* ----------------------------------------------------------------- widgets */

    function Row(title, description, control) {
      return h(
        'div',
        { className: 'dsh-skin-live-row' },
        h(
          'div',
          { className: 'dsh-skin-live-rowText' },
          h('div', { className: 'dsh-skin-live-title' }, title),
          description ? h('div', { className: 'dsh-skin-live-desc' }, description) : null,
        ),
        h('div', { className: 'dsh-skin-live-control' }, control),
      );
    }

    function Switch(props) {
      return h(
        'button',
        {
          type: 'button',
          className: 'dsh-skin-live-switch',
          role: 'switch',
          'aria-checked': props.checked ? 'true' : 'false',
          'aria-label': props.label,
          onClick: () => props.onChange(!props.checked),
        },
        h('span', { className: 'dsh-skin-live-knob' }),
      );
    }

    function Slider(props) {
      return h(
        'div',
        { className: 'dsh-skin-live-control' },
        h('input', {
          type: 'range',
          className: 'dsh-skin-live-slider',
          min: props.min,
          max: props.max,
          step: 1,
          value: props.value,
          'aria-label': props.label,
          onChange: (event) => props.onChange(Number(event.target.value)),
        }),
        h('span', { className: 'dsh-skin-live-value' }, String(props.value) + (props.unit || '')),
      );
    }

    function Segmented(props) {
      return h(
        'div',
        { className: 'dsh-skin-live-segmented', role: 'group', 'aria-label': props.label },
        props.options.map((option) =>
          h(
            'button',
            {
              key: option.value,
              type: 'button',
              className: 'dsh-skin-live-seg',
              'data-active': String(props.value === option.value),
              'aria-pressed': props.value === option.value ? 'true' : 'false',
              onClick: () => props.onChange(option.value),
            },
            option.label,
          ),
        ),
      );
    }

    /* ------------------------------------------------------------------- page */

    function createPage(t, locale) {
      return function SkinLiveSection() {
        useEpoch();
        useLocaleTick(locale);
        const settings = state.settings;
        const media = state.media;
        const fileRef = React.useRef(null);
        const [urlDraft, setUrlDraft] = React.useState(settings.source === 'url' ? settings.url : '');
        const [dropping, setDropping] = React.useState(false);

        React.useEffect(() => {
          if (settings.source === 'url') setUrlDraft(settings.url);
        }, [settings.source, settings.url]);

        const currentName =
          settings.source === 'file' && settings.fileName !== ''
            ? settings.fileName
            : settings.source === 'url'
              ? settings.url
              : '';
        const errorText = state.errorKey === '' ? '' : t(state.errorKey);

        return h(
          'div',
          { className: 'dsh-skin-live-page' },
          h('div', { className: 'dsh-skin-live-intro' }, t('intro')),
          Row(
            t('enable.title'),
            t('enable.desc'),
            Switch({
              checked: settings.enabled,
              label: t('enable.title'),
              onChange: (next) => {
                patchSettings({ enabled: next });
                if (next && state.media.url === null) void restoreSavedMedia();
              },
            }),
          ),
          Row(
            t('source.title'),
            t('source.desc'),
            h(
              'div',
              { className: 'dsh-skin-live-stack' },
              h(
                'div',
                {
                  className: 'dsh-skin-live-drop',
                  'data-over': String(dropping),
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => {
                    if (fileRef.current !== null) fileRef.current.click();
                  },
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (fileRef.current !== null) fileRef.current.click();
                    }
                  },
                  onDragOver: (event) => {
                    event.preventDefault();
                    setDropping(true);
                  },
                  onDragLeave: () => setDropping(false),
                  onDrop: (event) => {
                    event.preventDefault();
                    setDropping(false);
                    const file = event.dataTransfer !== null && event.dataTransfer.files !== undefined ? event.dataTransfer.files[0] : null;
                    if (file !== undefined && file !== null) void acceptFile(file);
                  },
                },
                h('span', null, t('source.drop')),
                h('span', { className: 'dsh-skin-live-dropHint' }, t('source.dropHint')),
              ),
              h(
                'div',
                { className: 'dsh-skin-live-inline' },
                h('input', {
                  className: 'dsh-skin-live-input',
                  type: 'text',
                  value: urlDraft,
                  placeholder: t('source.urlPlaceholder'),
                  spellCheck: false,
                  onChange: (event) => setUrlDraft(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') void acceptUrl(urlDraft);
                  },
                }),
                h(
                  'button',
                  { type: 'button', className: 'dsh-skin-live-btn', onClick: () => void acceptUrl(urlDraft) },
                  t('source.apply'),
                ),
              ),
              h(
                'div',
                { className: 'dsh-skin-live-inline' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-skin-live-btn',
                    onClick: () => {
                      if (fileRef.current !== null) fileRef.current.click();
                    },
                  },
                  t('source.pick'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-skin-live-btn',
                    'data-variant': 'quiet',
                    onClick: () => {
                      setUrlDraft('');
                      clearSkin();
                    },
                  },
                  t('source.clear'),
                ),
              ),
              h(
                'div',
                { className: 'dsh-skin-live-status' },
                t('source.current') + (currentName === '' ? t('source.none') : currentName) + (media.kind === null ? '' : ' · ' + media.kind),
              ),
              errorText === '' ? null : h('div', { className: 'dsh-skin-live-error' }, errorText),
              h('input', {
                ref: fileRef,
                type: 'file',
                accept: 'image/*,video/*,.mp4,.webm,.mov,.mkv',
                hidden: true,
                onChange: (event) => {
                  const file = event.target.files !== undefined ? event.target.files[0] : null;
                  if (file !== undefined && file !== null) void acceptFile(file);
                  event.target.value = '';
                },
              }),
            ),
          ),
          Row(
            t('fit.title'),
            t('fit.desc'),
            Segmented({
              value: settings.fit,
              label: t('fit.title'),
              onChange: (next) => patchSettings({ fit: next }),
              options: [
                { value: 'cover', label: t('fit.cover') },
                { value: 'contain', label: t('fit.contain') },
                { value: 'fill', label: t('fit.fill') },
              ],
            }),
          ),
          Row(
            t('panelOpacity.title'),
            t('panelOpacity.desc'),
            Slider({
              value: settings.panelOpacity,
              min: 0,
              max: 100,
              unit: '%',
              label: t('panelOpacity.title'),
              onChange: (next) => patchSettings({ panelOpacity: next }),
            }),
          ),
          Row(
            t('mediaOpacity.title'),
            t('mediaOpacity.desc'),
            Slider({
              value: settings.mediaOpacity,
              min: 10,
              max: 100,
              unit: '%',
              label: t('mediaOpacity.title'),
              onChange: (next) => patchSettings({ mediaOpacity: next }),
            }),
          ),
          Row(
            t('mediaBlur.title'),
            t('mediaBlur.desc'),
            Slider({
              value: settings.mediaBlur,
              min: 0,
              max: 40,
              unit: 'px',
              label: t('mediaBlur.title'),
              onChange: (next) => patchSettings({ mediaBlur: next }),
            }),
          ),
          Row(
            t('dim.title'),
            t('dim.desc'),
            Slider({
              value: settings.dim,
              min: 0,
              max: 80,
              unit: '%',
              label: t('dim.title'),
              onChange: (next) => patchSettings({ dim: next }),
            }),
          ),
        );
      };
    }

    /* ------------------------------------------------------------------ plugin */

    return {
      // 等待服务真正就绪，避免启动时永久捕获尚未提供的主题服务。
      inject: ['slots', 'theme', 'locale'],
      // 挂载皮肤设置与全局背景，并将副作用绑定到插件生命周期。
      apply(ctx) {
        const theme = typeof ctx.get === 'function' ? ctx.get('theme') : undefined;
        const locale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined;
        const layer = createLayer(theme);

        let t = (key) => (ZH[key] === undefined ? key : ZH[key]);

        /** Plugin-owned stylesheet: created here, removed with the plugin fiber. */
        ctx.effect(() => {
          const style = document.createElement('style');
          style.setAttribute('data-dsh-skin-live-style', '');
          style.textContent = CSS_TEXT;
          document.head.appendChild(style);
          return () => {
            style.remove();
          };
        }, PKG + ': stylesheet');

        ctx.effect(() => {
          if (locale === undefined || locale === null || typeof locale.register !== 'function') return undefined;
          const offZh = locale.register(PKG, 'zh', ZH);
          const offEn = locale.register(PKG, 'en', EN);
          return () => {
            offZh();
            offEn();
          };
        }, PKG + ': dictionaries');

        if (locale !== undefined && locale !== null && typeof locale.bind === 'function') {
          try {
            const bound = locale.bind(PKG);
            if (typeof bound === 'function') t = bound;
          } catch (error) {
            console.error('[' + PKG + '] locale bind failed', error);
          }
        }

        const page = createPage(t, locale);

        ctx.effect(() => {
          const stopStore = subscribe(() => layer.sync());
          const stopTheme = layer.watchTheme();
          layer.sync();
          void restoreSavedMedia();
          return () => {
            stopStore();
            stopTheme();
            layer.dispose();
          };
        }, PKG + ': media layer');

        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: 'skin-live',
              order: 25,
              label: () => t('section.title'),
            },
            page,
          ),
        );
      },
    };
  },
});
