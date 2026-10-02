import { commandEditor } from './aico-release.mjs'

// Optional command-copy enhancement; the published links also work without JavaScript.
for (const container of document.querySelectorAll('[data-beta-command]')) {
  container.replaceChildren(commandEditor(container.dataset.betaCommand))
}
