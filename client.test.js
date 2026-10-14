import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const PACKAGE = 'dsh-skin-live';
const LEGACY_PACKAGE = '@local/dsh-skin-live';
const STORAGE_KEY = PACKAGE + ':settings:v1';
const LEGACY_STORAGE_KEY = LEGACY_PACKAGE + ':settings:v1';
const SOURCE = await readFile(new URL('./client.js', import.meta.url), 'utf8');
const SAVED_SETTINGS = {
  enabled: true, source: 'url', url: 'https://example.com/background.mp4',
  fileName: '', fit: 'cover', panelOpacity: 55, mediaOpacity: 100, mediaBlur: 0, dim: 0,
};

class ElementFixture {
  // 创建最小 DOM 节点，记录插件的属性、样式和子节点。
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.style = {};
    this.children = [];
    this.parent = null;
    this.connected = false;
    this.paused = true;
  }

  // 按父节点连接状态判断媒体节点是否仍在文档中。
  get isConnected() { return this.connected || Boolean(this.parent?.isConnected); }

  // 记录插件写入的 DOM 标记。
  setAttribute(name, value) { this.attributes.set(name, value); }

  // 检查主题或皮肤标记是否存在。
  hasAttribute(name) { return this.attributes.has(name); }

  // 移除插件拥有的 DOM 标记。
  removeAttribute(name) { this.attributes.delete(name); }

  // 模拟同步切换深浅主题属性。
  toggleAttribute(name, enabled) {
    if (enabled) this.setAttribute(name, '');
    else this.removeAttribute(name);
  }

  // 将节点连接到父节点，保持子节点连接状态可查询。
  appendChild(child) { child.parent = this; this.children.push(child); }

  // 清理旧媒体节点，模拟更换背景素材。
  replaceChildren() { for (const child of this.children) child.parent = null; this.children = []; }

  // 从父节点移除插件元素。
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
    this.connected = false;
  }

  // 媒体事件由浏览器集成验证，本夹具仅接收事件注册。
  addEventListener() {}

  // 模拟静音视频开始播放。
  play() { this.paused = false; return Promise.resolve(); }
}

class ThemeFixture {
  // 保存基础调色板和当前主题覆盖层。
  constructor() {
    this.active = { id: 'dark', colorScheme: 'dark' };
    this.palette = { light: '#ffffff', dark: '#152a21' };
    this.layers = new Map();
  }

  // 返回主题服务提供的快照。
  getTheme() { return { active: this.active }; }

  // 模拟主题覆盖层的替换和仅撤销自身版本的释放语义。
  overrideTokens(source, tokens) {
    this.layers.set(source, tokens);
    return () => { if (this.layers.get(source) === tokens) this.layers.delete(source); };
  }
}

class ServiceHostFixture {
  // 保存 Cordis 服务依赖和插件副作用，复现服务晚于插件到达的情况。
  constructor(plugin) {
    this.plugin = plugin;
    this.services = new Map();
    this.disposers = [];
    this.applied = false;
    this.page = null;
  }

  // 按插件声明的 inject 依赖等待服务，而非按包文件下载顺序执行。
  provide(name, service) {
    this.services.set(name, service);
    if (this.applied || !this.plugin.inject.every((required) => this.services.has(required))) return;
    this.applied = true;
    this.plugin.apply({ get: (key) => this.services.get(key), slots: this.services.get('slots'),
      effect: (effect) => { const dispose = effect(); if (dispose) this.disposers.push(dispose); } });
  }

  // 释放副作用，验证关闭插件能够恢复背景和主题。
  dispose() { for (const dispose of this.disposers.reverse()) dispose(); }
}

// 为 React 组件创建可检查的元素树，避免引入与本次修复无关的依赖。
function createReactFixture() {
  return { createElement: (type, props, ...children) => ({ type, props, children }),
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    useState: (initial) => [initial, () => {}], useRef: () => ({ current: null }), useEffect: () => {} };
}

// 保留真实 URL 解析，另加对象 URL 生成，用来观察本地素材是否被挂到背景层。
class UrlFixture extends URL {
  // 用素材名生成可读的对象 URL，便于断言来源。
  static createObjectURL(blob) { return 'blob:fixture/' + String((blob && blob.name) || 'media'); }
  // 释放语义由浏览器集成验证，夹具只需可调用。
  static revokeObjectURL() {}
}

// 最小 IndexedDB：只为插件用到的 open / transaction / put / get / delete 提供行为。
class IndexedDbFixture {
  // 以「库名 -> 表名 -> 键值」的嵌套 Map 初始化已有数据。
  constructor(seed = new Map()) { this.databases = seed; }

  // 返回浏览器风格的请求对象，异步回调先注册后触发。
  open(name) {
    if (!this.databases.has(name)) this.databases.set(name, new Map());
    const stores = this.databases.get(name);
    const request = { result: null };
    request.result = {
      objectStoreNames: { contains: (store) => stores.has(store) },
      createObjectStore: (store) => { if (!stores.has(store)) stores.set(store, new Map()); return {}; },
      close: () => {},
      transaction: (store, _mode) => {
        const table = () => { if (!stores.has(store)) stores.set(store, new Map()); return stores.get(store); };
        const tx = { oncomplete: null, onerror: null, onabort: null };
        const settle = (run) => { setImmediate(() => { run(table()); tx.oncomplete?.(); }); };
        tx.objectStore = () => ({
          put: (value, key) => settle((rows) => rows.set(key, value)),
          delete: (key) => settle((rows) => rows.delete(key)),
          get: (key) => {
            const read = {};
            setImmediate(() => { read.result = table().get(key); read.onsuccess?.(); });
            return read;
          },
        });
        return tx;
      },
    };
    setImmediate(() => { request.onupgradeneeded?.(); request.onsuccess?.(); });
    return request;
  }
}

// 创建有已保存视频的浏览器夹具，并捕获插件导出。
function createBrowserFixture(settings = SAVED_SETTINGS, options = {}) {
  const store = options.store ?? new Map([[STORAGE_KEY, JSON.stringify(settings)]]);
  const document = { documentElement: new ElementFixture('html'), body: new ElementFixture('body'),
    head: new ElementFixture('head'), createElement: (tag) => new ElementFixture(tag) };
  for (const node of [document.documentElement, document.body, document.head]) node.connected = true;
  document.body.setAttribute('data-ds-dark-theme', '');
  const theme = new ThemeFixture();
  const observers = [];
  let plugin;
  const window = { localStorage: { getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value) },
    indexedDB: options.indexedDb,
    location: { href: 'http://127.0.0.1:3080/' }, setTimeout,
    getComputedStyle: (element) => ({ getPropertyValue: () => theme.palette[element.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light'] }),
    __ModuleLoader__: { load: (registration) => { plugin = registration.factory(() => createReactFixture()); } } };
  // 观察器不自动调用，测试可显式触发外部主题变化。
  class ObserverFixture {
    // 保存主题变化回调供测试驱动。
    constructor(callback) { this.callback = callback; observers.push(this); }
    // 接收观察目标注册。
    observe() {}
    // 记录插件卸载后的观察器释放。
    disconnect() { this.disconnected = true; }
  }
  vm.runInNewContext(SOURCE, { window, document, URL: UrlFixture, console, MutationObserver: ObserverFixture });
  return { document, theme, observers, store, indexedDb: options.indexedDb, host: new ServiceHostFixture(plugin) };
}

// 提供设置槽与语言服务，并记录插件自己的设置页面。
function provideSettingsServices(fixture) {
  const host = fixture.host;
  host.provide('slots', { inject: (_name, register) => register(),
    register: (_options, page) => { host.page = page; } });
  host.provide('locale', { register: () => () => {}, bind: () => (key) => key });
}

// 等待已保存 URL 的异步恢复完成。
async function restoreMedia(fixture, ticks = 8) {
  provideSettingsServices(fixture);
  fixture.host.provide('theme', fixture.theme);
  for (let index = 0; index < ticks; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

// 根据可访问属性查找设置控件，不依赖组件树的位置。
function findControl(node, attribute, value) {
  if (!node || typeof node !== 'object') return null;
  if (node.props?.[attribute] === value) return node;
  for (const child of (node.children || []).flat()) {
    const found = findControl(child, attribute, value);
    if (found) return found;
  }
  return null;
}

// 回归：设置槽先就绪时，插件仍必须等待主题，避免永久捕获 undefined。
test('主题服务晚于设置槽到达时，不提前初始化皮肤', async () => {
  const fixture = createBrowserFixture();
  provideSettingsServices(fixture);
  assert.equal(fixture.host.applied, false);
  fixture.host.provide('theme', fixture.theme);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fixture.host.applied, true);
  assert.equal(fixture.theme.layers.get(PACKAGE)['--dsw-alias-bg-base'].dark, 'transparent');
});

// 验证保存的视频恢复后仅创建脱离文档流、不可交互的背景层。
test('恢复视频背景，并透明化应用基础背景', async () => {
  const fixture = createBrowserFixture();
  await restoreMedia(fixture);
  const [layer] = fixture.document.body.children;
  assert.equal(layer.style.position, 'fixed');
  assert.equal(layer.style.pointerEvents, 'none');
  assert.equal(layer.children[0].tagName, 'VIDEO');
  assert.equal(layer.children[0].muted, true);
  assert.equal(layer.children[0].src, SAVED_SETTINGS.url);
  assert.equal(fixture.theme.layers.get(PACKAGE)['--dsw-alias-bg-base'].light, 'transparent');
  assert.deepEqual(Object.keys(fixture.document.body.style), []);
});

// 回归：侧栏属于全局背景画布，面板不透明度只能影响卡片等局部表面。
for (const panelOpacity of [0, 75, 100]) {
  test(`面板不透明度 ${panelOpacity}% 时，侧栏仍显示全局背景`, async () => {
    const fixture = createBrowserFixture({ ...SAVED_SETTINGS, panelOpacity });
    await restoreMedia(fixture);
    const tokens = fixture.theme.layers.get(PACKAGE);
    assert.equal(tokens['--dsw-specific-sidebar-fill'].light, 'transparent');
    assert.equal(tokens['--dsw-specific-sidebar-fill'].dark, 'transparent');
    assert.ok(Object.keys(tokens).every((name) => name.includes('bg-') || name.startsWith('--dsw-specific-')));
    assert.equal(Object.hasOwn(tokens, '--dsw-alias-label-primary'), false);
  });
}

// 验证背景开关保留素材，并可恢复默认界面。
test('关闭再启用皮肤，撤销并恢复背景覆盖', async () => {
  const fixture = createBrowserFixture();
  await restoreMedia(fixture);
  findControl(fixture.host.page(), 'role', 'switch').props.onClick();
  assert.equal(fixture.document.body.children.length, 0);
  assert.equal(fixture.theme.layers.size, 0);
  assert.equal(fixture.document.documentElement.hasAttribute('data-dsh-skin-live'), false);
  findControl(fixture.host.page(), 'role', 'switch').props.onClick();
  assert.equal(fixture.document.body.children.length, 1);
  assert.equal(fixture.theme.layers.size, 1);
});

// 验证切换主题后重读调色板，卸载后不遗留背景或主题覆盖层。
test('主题切换保持背景透明，卸载完整释放副作用', async () => {
  const fixture = createBrowserFixture();
  await restoreMedia(fixture);
  fixture.theme.active = { id: 'light', colorScheme: 'light' };
  fixture.theme.palette.light = '#f4faf7';
  fixture.observers[0].callback();
  const tokens = fixture.theme.layers.get(PACKAGE);
  assert.equal(tokens['--dsw-alias-bg-base'].light, 'transparent');
  assert.match(tokens['--dsw-alias-bg-layer-1'].light, /#f4faf7/);
  fixture.host.dispose();
  assert.equal(fixture.theme.layers.size, 0);
  assert.equal(fixture.document.body.children.length, 0);
  assert.equal(fixture.document.head.children.length, 0);
  assert.equal(fixture.observers[0].disconnected, true);
});

// 回归：1.0.0 改名后，旧包名下保存的参数必须被沿用并落到新键，不能重置成默认值。
test('沿用旧包名保存的设置，并写入新存储键', async () => {
  const stored = { ...SAVED_SETTINGS, panelOpacity: 30, mediaBlur: 8 };
  const store = new Map([[LEGACY_STORAGE_KEY, JSON.stringify(stored)]]);
  const fixture = createBrowserFixture(undefined, { store });
  await restoreMedia(fixture);
  assert.equal(fixture.document.body.children[0].children[0].src, SAVED_SETTINGS.url);
  const adopted = JSON.parse(fixture.store.get(STORAGE_KEY));
  assert.equal(adopted.panelOpacity, 30);
  assert.equal(adopted.mediaBlur, 8);
  assert.match(fixture.theme.layers.get(PACKAGE)['--dsw-alias-bg-layer-1'].dark, /30%/);
});

// 回归：旧包名的 IndexedDB 素材在升级后仍要显示，并复制一份到新库名。
test('沿用旧包名保存的本地素材，并复制到新素材库', async () => {
  const record = { blob: { name: 'legacy.mp4', size: 2048 }, kind: 'video', name: 'legacy.mp4' };
  const indexedDb = new IndexedDbFixture(
    new Map([[LEGACY_PACKAGE + ':media', new Map([['blobs', new Map([['current', record]])]])]]),
  );
  const store = new Map([[STORAGE_KEY, JSON.stringify({ ...SAVED_SETTINGS, source: 'file', url: '', fileName: 'legacy.mp4' })]]);
  const fixture = createBrowserFixture(undefined, { store, indexedDb });
  await restoreMedia(fixture, 16);
  const [layer] = fixture.document.body.children;
  assert.equal(layer.children[0].tagName, 'VIDEO');
  assert.equal(layer.children[0].src, 'blob:fixture/legacy.mp4');
  const copied = indexedDb.databases.get(PACKAGE + ':media').get('blobs').get('current');
  assert.equal(copied.name, 'legacy.mp4');
  assert.equal(indexedDb.databases.get(LEGACY_PACKAGE + ':media').get('blobs').get('current'), record);
});
