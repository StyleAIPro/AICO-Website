import { loadAicoRelease, commandEditor } from './aico-release.mjs'

export function componentProducts(release) {
  return [{ id: 'aico-harness', name: 'Harness', version: release.version,
    compatibility: release.compatibility, downloads: [{ kind: 'bundle', url: release.url, filename: release.filename, bytes: release.bytes, sha256: release.sha256 }] }, ...release.businesses.map(product => ({...product, compatibility: release.compatibility}))]
}
const initialCards = new WeakMap()
function element(tag, text, className) {
  const node = document.createElement(tag)
  if (text) node.textContent = text
  if (className) node.className = className
  return node
}
function versionContent(product) {
  const body = element('div')
  for (const file of product.downloads) {
    const link = element('a', `${file.kind === 'bundle' ? '下载 Windows 插件' : '下载配套资源'} · ${product.version}`, 'button')
    link.href = file.url; body.append(link)
    body.append(element('p', `${file.filename} · ${(file.bytes / 1048576).toFixed(1)} MiB`, 'component-help'))
    if (file.kind === 'bundle') body.append(commandEditor(file.filename))
    else body.append(element('p', '配套资源不使用 plugin add 命令安装，请按此版本资源说明准备。'))
    const details = element('details'), summary = element('summary', '文件校验')
    details.append(summary, element('code', `SHA-256: ${file.sha256}`)); body.append(details)
  }
  if (product.compatibility) body.append(element('p', `适配原版：${product.compatibility.join('；')}`, 'component-help'))
  return body
}
export async function mountComponentDownloads({ root = document.querySelector('[data-component-downloads]'), loader = loadAicoRelease, fetcher = fetch } = {}) {
  if (!root) return
  if (root.dataset.loading === 'true') return
  root.dataset.loading = 'true'
  let status = root.querySelector('[data-download-status]')
  if (!status) { status = element('p', '', 'download-status'); status.dataset.downloadStatus = ''; status.setAttribute('role', 'status'); root.prepend(status) }
  let retry = root.querySelector('[data-download-retry]')
  if (!retry) { retry = element('button', '重新加载版本', 'download-retry'); retry.type = 'button'; retry.dataset.downloadRetry = ''; status.after(retry); retry.addEventListener('click', () => mountComponentDownloads({root, loader, fetcher: sourceFetch})) }
  retry.hidden = true; status.textContent = '正在读取最新公开版本…'
  root.querySelectorAll('[data-component]').forEach(card => {
    const latest=card.querySelector('[data-component-latest]')
    if (!initialCards.has(card)) initialCards.set(card, latest.cloneNode(true))
    latest.replaceChildren(...[...initialCards.get(card).childNodes].map(node => node.cloneNode(true)))
    card.querySelector('[data-component-version]').textContent='正在读取版本…'
  })
  // Bound all release requests, including response bodies, so stalled networks can be retried.
  const sourceFetch = fetcher
  const timedFetch = async (url, options = {}) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    try { const response = await sourceFetch(url, {...options, signal: controller.signal});
      if (response.arrayBuffer) { const bytes = await response.arrayBuffer(); return new Response(bytes, {status: response.status, headers: response.headers}) }
      return response
    } finally { clearTimeout(timeout) }
  }
  fetcher = timedFetch
  const current = new Map()
  const channel = new URL(root.dataset.channel, document.baseURI)
  // Local candidate previews read the same public catalog as the deployed site.
  if (channel.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(channel.hostname)) {
    const name = /\/channels\/(preview|stable)\.json$/.exec(channel.pathname)?.[1]
    if (name) channel.href = `https://styleaipro.github.io/AICO-Website/aico/channels/${name}.json`
  }
  try {
    const release = await loader({ channelUrl: channel.href, fetcher })
    status.textContent = '版本已更新。先安装 Harness，再按需安装业务插件。'
    root.querySelectorAll('[data-component-version]').forEach(node => { node.textContent='最新公开版 · 待发布' })
    for (const product of componentProducts(release)) {
      const card = [...root.querySelectorAll('[data-component]')].find(node => node.dataset.component === product.id)
      if (!card) continue
      if (!product.downloads.some(file => file.kind === 'bundle')) continue
      current.set(product.id, product.version)
      card.querySelector('[data-component-version]').textContent = `最新公开版 · ${product.version}`
      card.querySelector('[data-component-latest]').replaceChildren(versionContent(product))
    }
  } catch (error) {
    const unpublished = error.status === 404 && error.url === channel.href
    status.textContent = unpublished ? '插件公开版本尚未提供。发布后可在这里下载。' : '暂时无法读取版本信息。请检查网络后重试；这不代表插件尚未发布。'
    retry.hidden = false
    for (const card of root.querySelectorAll('[data-component]')) {
      card.querySelector('[data-component-version]').textContent = unpublished ? '最新公开版 · 待发布' : '版本信息 · 加载失败'
      const button = card.querySelector('[data-component-latest] button:disabled')
      if (button) button.textContent = unpublished ? '最新版本下载 · 待发布' : '下载暂不可用 · 请重试'
    }
  }
  // Historical entries point to independent, publicly verified release channels.
  // Absence of this registry never disables a valid latest download.
  try {
    const response = await fetcher(new URL('./component-history.json', import.meta.url), { cache: 'no-store' })
    if (!response.ok) return
    const registry = await response.json()
    if (registry.schema !== 1 || !Array.isArray(registry.channels) || registry.channels.length > 30) return
    const seen = new Set()
    for (const card of root.querySelectorAll('[data-component-history]')) { card.replaceChildren(element('p', '暂无已核验的历史版本。')); delete card.dataset.loaded }
    for (const entry of registry.channels) {
      try {
        const url = new URL(entry.url, channel)
        if (url.origin !== channel.origin || !url.pathname.startsWith(channel.pathname.replace(/channels\/[^/]+$/, 'channels/'))) continue
        const release = await loader({ channelUrl: url.href, expectedChannel: entry.channel, fetcher, ...(entry.sha256 ? {archivedChannelSha256: entry.sha256} : {}) })
        for (const product of componentProducts(release)) {
          const key = `${product.id}:${product.version}`
          if (seen.has(key) || current.get(product.id) === product.version) continue
          const card = [...root.querySelectorAll('[data-component]')].find(node => node.dataset.component === product.id)
          if (!card) continue
          const history = card.querySelector('[data-component-history]')
          if (!history.dataset.loaded) { history.replaceChildren(); history.dataset.loaded = 'true' }
          history.append(element('h4', `版本 ${product.version}`), element('p', '历史版本：请先核对适配版本与迁移说明，不直接覆盖较新数据。', 'component-help'), versionContent(product)); seen.add(key)
        }
      } catch { /* A missing historical release must not break the other versions. */ }
    }
  } catch { /* No verified history is an explicit empty state. */ } finally { root.dataset.loading = 'false' }
}
if (typeof document !== 'undefined') void mountComponentDownloads()
