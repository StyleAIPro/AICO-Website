const digestPattern = /^[a-f0-9]{64}$/
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const businessNames = Object.freeze({ 'aico-wiki': 'Wiki', 'aico-knowledge': 'Knowledge（旧版）', 'aico-profile': 'Profile', 'aico-ppt-skill': 'PPT' })

function record(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new Error(`Invalid ${label}`)
  return value
}

async function boundedJson(fetcher, url, maximum) {
  const response = await fetcher(url, { cache: 'no-store', credentials: 'omit', redirect: 'error' })
  if (!response.ok) throw Object.assign(new Error('Release document is unavailable'), { status: response.status, url: String(url) })
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maximum) throw new Error('Release document exceeds its limit')
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (!bytes.length || bytes.length > maximum) throw new Error('Release document exceeds its limit')
  return { bytes, value: JSON.parse(new TextDecoder().decode(bytes)) }
}

function hex(bytes) { return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('') }

function businessDownload(artifact, resources, historical = false) {
  const resource = artifact?.kind === 'resource'
  record(artifact, ['id', 'kind', 'target', ...(resource ? ['resourceId'] : []), 'url', 'sha256', 'bytes'], 'business artifact')
  const url = new URL(artifact.url)
  const filename = decodeURIComponent(url.pathname.split('/').at(-1) ?? '')
  if (!['bundle', 'resource'].includes(artifact.kind)
    || (resource ? (artifact.target !== 'win32-x64' && !(historical && artifact.target === 'all')) : !['all', 'win32-x64'].includes(artifact.target))
    || (resource && !resources.includes(artifact.resourceId))
    || url.protocol !== 'https:' || url.hostname !== 'gitcode.com' || url.username || url.password || url.search || url.hash
    || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.tgz$/.test(filename)
    || !digestPattern.test(artifact.sha256) || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 1) throw new Error('Invalid business artifact')
  return Object.freeze({ ...artifact, filename,
    ...(!resource ? { command: `dsh plugin add "./${filename}" --ignore-scripts` } : {}) })
}

/** Resolve public bootstrap display data. Runtime signature verification remains inside the installed adapter. */
export async function loadAicoRelease({ channelUrl, expectedChannel, fetcher = fetch, cryptoProvider = crypto, now = Date.now(), archivedChannelSha256 }) {
  const channelLocation = new URL(channelUrl)
  expectedChannel ??= /\/channels\/(preview|stable)\.json$/.exec(channelLocation.pathname)?.[1]
  if (!['preview', 'stable'].includes(expectedChannel)) throw new Error('Invalid release channel')
  if (channelLocation.protocol !== 'https:' || channelLocation.username || channelLocation.password || channelLocation.hash) throw new Error('Invalid channel location')
  const { bytes: channelBytes, value: channel } = await boundedJson(fetcher, channelLocation, 65536)
  record(channel, ['schema', 'channel', 'sequence', 'issuedAt', 'expiresAt', 'snapshot'], 'channel')
  const archived = typeof archivedChannelSha256 === 'string' && digestPattern.test(archivedChannelSha256)
  if (archivedChannelSha256 !== undefined && (!archived || hex(new Uint8Array(await cryptoProvider.subtle.digest('SHA-256', channelBytes))) !== archivedChannelSha256)) throw new Error('Archive channel digest mismatch')
  if (channel.schema !== 3 || channel.channel !== expectedChannel || !Number.isSafeInteger(channel.sequence) || channel.sequence < 1
    || !Number.isFinite(Date.parse(channel.issuedAt)) || !Number.isFinite(Date.parse(channel.expiresAt))
    || Date.parse(channel.issuedAt) > now || Date.parse(channel.expiresAt) <= Date.parse(channel.issuedAt) || (!archived && Date.parse(channel.expiresAt) <= now)) throw new Error('Channel is not currently valid')
  const snapshot = record(channel.snapshot, ['url', 'sha256', 'bytes'], 'snapshot reference')
  const snapshotLocation = new URL(snapshot.url)
  const root = channelLocation.pathname.replace(/channels\/[^/]+$/, '')
  if (snapshotLocation.origin !== channelLocation.origin || !snapshotLocation.pathname.startsWith(root + 'releases/')
    || snapshotLocation.search || snapshotLocation.hash || !digestPattern.test(snapshot.sha256)
    || !Number.isSafeInteger(snapshot.bytes) || snapshot.bytes < 1 || snapshot.bytes > 2097152) throw new Error('Invalid snapshot location')
  const loaded = await boundedJson(fetcher, snapshotLocation, 2097152)
  if (loaded.bytes.length !== snapshot.bytes
    || hex(new Uint8Array(await cryptoProvider.subtle.digest('SHA-256', loaded.bytes))) !== snapshot.sha256) throw new Error('Snapshot digest mismatch')
  const index = record(loaded.value, ['schema', 'releaseId', 'createdAt', 'compatibility', 'products'], 'snapshot')
  if (index.schema !== 3 || typeof index.releaseId !== 'string' || !index.releaseId || !Array.isArray(index.compatibility) || !index.compatibility.length
    || !Array.isArray(index.products)) throw new Error('Invalid release snapshot')
  const approvalUrl = new URL(`${root}website-ready/${expectedChannel}.json`, channelLocation.origin)
  const { value: approval } = await boundedJson(fetcher, approvalUrl, 4096)
  record(approval, ['schema', 'channel', 'sequence', 'releaseId', 'channelSha256', 'snapshotSha256', 'verifiedAt'], 'website approval')
  if (approval.schema !== 1 || approval.channel !== expectedChannel || approval.sequence !== channel.sequence
    || approval.releaseId !== index.releaseId || approval.snapshotSha256 !== snapshot.sha256
    || approval.channelSha256 !== hex(new Uint8Array(await cryptoProvider.subtle.digest('SHA-256', channelBytes)))
    || !Number.isFinite(Date.parse(approval.verifiedAt)) || Date.parse(approval.verifiedAt) > now || (archived && (Date.parse(approval.verifiedAt) < Date.parse(channel.issuedAt) || Date.parse(approval.verifiedAt) >= Date.parse(channel.expiresAt)))) throw new Error('Website approval does not match release')
  const compatibility = index.compatibility.map(row => {
    record(row, ['desktopPackage', 'desktopVersion', 'dshVersion'], 'compatibility row')
    if (!['dsh-plugin-desktop-beta', 'dsh-plugin-desktop'].includes(row.desktopPackage)
      || !versionPattern.test(row.desktopVersion) || !versionPattern.test(row.dshVersion)) throw new Error('Invalid compatibility row')
    return `${row.desktopPackage} ${row.desktopVersion} · DSH ${row.dshVersion}`
  })
  if (new Set(compatibility).size !== compatibility.length) throw new Error('Duplicate compatibility row')
  const adapters = index.products.filter(product => product?.id === 'aico-harness' && product.line === 'adapter')
  if (adapters.length !== 1 || !versionPattern.test(adapters[0].version) || !Array.isArray(adapters[0].artifacts)) throw new Error('Missing adapter release')
  const seen = new Set(['aico-harness']), businesses = []
  for (const product of index.products) {
    if (product === adapters[0]) continue
    record(product, ['id', 'line', 'version', 'adapterVersion', 'resources', 'artifacts'], 'business product')
    if (!Object.hasOwn(businessNames, product.id) || seen.has(product.id) || product.line !== 'business'
      || !versionPattern.test(product.version) || product.adapterVersion !== adapters[0].version
      || !Array.isArray(product.resources) || !Array.isArray(product.artifacts)) throw new Error('Invalid business product')
    seen.add(product.id)
    // Historical signed snapshots remain readable; retired products never create install cards.
    const downloads = product.artifacts.map(artifact => businessDownload(artifact, product.resources, product.id === 'aico-knowledge'))
    if (product.id !== 'aico-knowledge') businesses.push(Object.freeze({ id: product.id, name: businessNames[product.id], version: product.version,
      resources: Object.freeze([...product.resources]), downloads: Object.freeze(downloads) }))
  }
  const artifacts = adapters[0].artifacts.filter(artifact => artifact?.kind === 'bundle' && artifact.target === 'all')
  if (artifacts.length !== 1) throw new Error('Ambiguous adapter release')
  const artifact = record(artifacts[0], ['id', 'kind', 'target', 'url', 'sha256', 'bytes'], 'adapter artifact')
  const download = new URL(artifact.url)
  const filename = decodeURIComponent(download.pathname.split('/').at(-1) ?? '')
  if (download.protocol !== 'https:' || download.username || download.password || download.search || download.hash
    || download.hostname !== 'gitcode.com' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.tgz$/.test(filename)
    || !digestPattern.test(artifact.sha256) || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 1) throw new Error('Invalid adapter artifact')
  return Object.freeze({ channel: expectedChannel, releaseId: index.releaseId, version: adapters[0].version, compatibility: Object.freeze(compatibility), businesses: Object.freeze(businesses), filename, url: download.href,
    sha256: artifact.sha256, bytes: artifact.bytes, command: 'dsh plugin add "<下载包的完整路径>" --ignore-scripts' })
}

function size(bytes) { return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MiB` : `${(bytes / 1024).toFixed(1)} KiB` }

function copyButton(command) {
  const button = document.createElement('button')
  button.type = 'button'; button.textContent = '复制安装命令'
  button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(command); button.textContent = '已复制' }
    catch { button.textContent = '复制失败，请手动选择命令' }
  })
  return button
}

function mountDeveloper(release) {
  const status = document.querySelector('[data-developer-status]')
  if (!status) return
  status.textContent = `公开插件目录：${release.releaseId} · ${release.channel}；源码锁定清单待发布`
  const adapter = document.querySelector('[data-dev-adapter]')
  if (adapter) adapter.textContent = `目录版本 ${release.version}；源码绑定待发布`
  for (const product of release.businesses) {
    const node = document.querySelector(`[data-dev-${({ 'aico-wiki':'wiki', 'aico-knowledge':'knowledge', 'aico-profile':'profile', 'aico-ppt-skill':'ppt' })[product.id]}]`)
    if (node) node.textContent = `目录版本 ${product.version}；源码绑定待发布`
  }
  const note = document.querySelector('[data-dev-release]')
  if (note) note.textContent = `发布目录 ${release.releaseId} 已读取。源码 commit、lockfile 摘要、资源摘要和最终包测试回执尚需单独绑定，当前表格不代表可复现发布组合。`
}

function mountHome(release) {
  const status = document.querySelector('[data-home-status]')
  if (!status) return
  status.textContent = `Windows 预览版 ${release.version} 已发布`
  status.classList.add('neutral')
  document.querySelector('[data-home-action]').textContent = '查看 Windows 安装与下载 ↗'
  document.querySelector('[data-home-meta]').textContent = `AICO-Harness ${release.version} 已开放`
  document.querySelector('[data-home-release-title]').textContent = 'Windows 预览版已通过公开验证。'
  document.querySelector('[data-home-release-description]').textContent = `发布组合 ${release.releaseId} 已开放。请在安装页核对原版 Desktop 兼容版本、文件摘要与安装步骤。`
  document.querySelector('[data-home-release-tag]').textContent = 'AICO 插件可下载'
}

export function localInstallCommand(directory, filename) {
  if (typeof directory !== 'string' || !/^[A-Za-z]:[\\/]/.test(directory) || /[<>:"|?*`$%\r\n\0]/.test(directory.slice(2)) || /["`$%]/.test(directory)) return null
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.tgz$/.test(filename)) return null
  const path = directory.replaceAll('/', '\\').replace(/[\\]+$/, '')
  return `dsh plugin add "${path}\\${filename}" --ignore-scripts`
}

export function commandEditor(filename) {
  const box = document.createElement('div'); box.className = 'command-box'
  const label = document.createElement('label'); label.textContent = '插件包所在的 Windows 下载目录'
  const input = document.createElement('input'); input.type = 'text'; input.placeholder = '例如 C:\\Downloads'; input.autocomplete = 'off'
  label.append(input)
  const pre = document.createElement('pre'), code = document.createElement('code'); pre.append(code)
  const hint = document.createElement('p'); hint.textContent = '填写保存此包的目录后复制命令。在 Desktop 托盘打开 DSH Terminal 执行。'
  const button = document.createElement('button'); button.type = 'button'; button.textContent = '复制安装命令'; button.disabled = true
  const message = document.createElement('p'); message.setAttribute('role', 'status')
  const update = () => {
    const command = localInstallCommand(input.value.trim(), filename)
    code.textContent = command || `dsh plugin add "<下载目录>\\${filename}" --ignore-scripts`
    button.disabled = !command; message.textContent = input.value && !command ? '请输入 Windows 绝对目录；不支持命令特殊字符。' : ''
  }
  input.addEventListener('input', update)
  button.addEventListener('click', async () => { const command = localInstallCommand(input.value.trim(), filename); if (!command) return
    try { await navigator.clipboard.writeText(command); message.textContent = '已复制安装命令' } catch { message.textContent = '无法访问剪贴板，请选中上方命令手动复制。' }
  })
  update(); box.append(label, hint, pre, button, message); return box
}

function businessFiles(product) {
  const details = document.createElement('details')
  details.className = 'file-verification'; details.open = true
  const summary = document.createElement('summary')
  summary.textContent = `${product.name} ${product.version} · 插件包与平台资源`
  details.append(summary)
  const notice = document.createElement('p')
  notice.textContent = '先安装匹配版本的 AICO-Harness。在目标 Profile 的 DSH Terminal 中进入下载目录，再执行命令。命令只安装当前 Profile。'
  if (product.resources.length) notice.textContent += '本插件还需要平台运行时；资源包不能用 plugin add 安装，请按本期资源说明完成准备与登记；“插件信息”是只读页面，不负责安装资源。'
  details.append(notice)
  if (product.id === 'aico-wiki') {
    const paragraph = document.createElement('p')
    paragraph.textContent = 'AICO Wiki 可直接创建空知识库。旧 AICO 知识库为可选资料，单独下载后只读导入；插件不会自动下载资料。'
    details.append(paragraph)
  }
  if (product.id === 'aico-knowledge') {
    const paragraph = document.createElement('p'), link = document.createElement('a')
    paragraph.textContent = '此插件包不包含知识库数据。首次使用需单独下载知识库，已有完整目录可直接复用。'
    link.href = '#knowledge-library'; link.textContent = '查看知识库下载与目录选择步骤'
    paragraph.append(document.createTextNode(' '), link)
    details.append(paragraph)
  }
  for (const file of product.downloads) {
    const paragraph = document.createElement('p'), link = document.createElement('a')
    link.href = file.url
    link.textContent = `${file.kind === 'bundle' ? '插件包' : '运行时资源'} · Windows x64 · ${file.filename} · ${size(file.bytes)}`
    paragraph.append(link)
    const digest = document.createElement('code'); digest.textContent = ` SHA-256: ${file.sha256}`
    paragraph.append(document.createElement('br'), digest)
    if (file.command) {
      const code = document.createElement('code'); code.textContent = file.command
      paragraph.append(commandEditor(file.filename))
    }
    details.append(paragraph)
  }
  return details
}

async function mount() {
  if (document.documentElement.dataset.releaseMode === 'manual-beta') return
  if (document.querySelector('[data-component-downloads]')) return
  const row = document.querySelector('#aico2-adapter')
  if (!row && !document.querySelector('[data-developer-status]') && !document.querySelector('[data-home-status]')) return
  try {
    const release = await loadAicoRelease({ channelUrl: new URL(row?.dataset.channel || 'aico/channels/preview.json', document.baseURI).href })
    mountHome(release)
    mountDeveloper(release)
    if (!row) return
    row.dataset.status = 'ready'
    row.querySelector('[data-release-version]').textContent = `v${release.version}`
    row.querySelector('[data-release-version]').classList.add('neutral')
    row.querySelector('[data-release-description]').textContent = `AICO-Harness ${release.version} 已通过公开发布校验。先核对下方精确 Desktop/DSH 兼容版本，再下载并在原版 Desktop 的 DSH Terminal 中安装。`
    row.querySelector('[data-release-size]').textContent = size(release.bytes)
    const download = row.querySelector('[data-release-download]')
    download.href = release.url; download.removeAttribute('aria-disabled'); download.textContent = '从 GitCode 下载 ↗'
    row.querySelector('[data-release-command]').textContent = release.command
    row.querySelector('.stage-actions').after(commandEditor(release.filename))
    row.querySelector('[data-release-filename]').textContent = release.filename
    row.querySelector('[data-release-sha256]').textContent = release.sha256
    row.querySelector('[data-release-compatibility]').textContent = release.compatibility.join('；')
    row.querySelector('[data-release-verification]').hidden = false
    const business = document.querySelector('#aico2-business')
    if (business) {
      business.dataset.status = 'ready'
      business.querySelector('[data-business-versions]').textContent = release.businesses.length
        ? release.businesses.map(product => `${product.name} ${product.version}`).join(' · ') : '本期未包含业务插件'
      business.querySelector('[data-business-versions]').classList.add('neutral')
      const files = business.querySelector('[data-business-files]') || business
      for (const product of release.businesses) files.append(businessFiles(product))
    }
    const status = document.querySelector('[data-install-status]')
    if (status) {
      status.textContent = `AICO 插件 · ${release.version} 可下载`
      status.classList.add('neutral')
    }
    const intro = document.querySelector('[data-install-intro]')
    if (intro) intro.textContent = `AICO 预览组合 ${release.releaseId} 已通过公开发布校验。请按以下顺序获取原版 Desktop、安装匹配的 Harness，再选择本期业务插件。`
  } catch {
    if (row) row.dataset.status = 'pending'
  }
}

if (typeof document !== 'undefined') void mount()
