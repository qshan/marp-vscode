import { browser, type MarpCoreBrowser } from '@marp-team/marp-core/browser'

export default function preview() {
  let marpState: boolean | undefined
  let marpBrowser: MarpCoreBrowser | undefined

  // Detect update of DOM
  const updateCallback = () => {
    const marpVscode = document.getElementById('__marp-vscode')
    const newMarpState = !!marpVscode

    if (marpState !== newMarpState) {
      document.body.classList.toggle('marp-vscode', newMarpState)

      if (newMarpState) {
        marpBrowser = browser()
      } else {
        marpBrowser?.cleanup()
        marpBrowser = undefined
      }

      marpState = newMarpState
    } else {
      // Required to modify <pre is="marp-pre"> to <marp-pre>.
      if (newMarpState) marpBrowser?.update()
    }

    if (marpState) {
      if (marpVscode) forceUpgradeCustomElements(marpVscode)
      removeStyles()
    } else {
      restoreStyles()
    }
  }

  window.addEventListener('load', () => window.setTimeout(updateCallback, 100))
  window.addEventListener('vscode.markdown.updateContent', updateCallback)

  // Initial update
  updateCallback()
}

/**
 * Detect not-upgraded custom elements defined by `is` attribute and force
 * upgrading.
 *
 * In the incremental DOM update, the browser will not be triggered upgrade for
 * native HTML elements to the custom element.
 *
 * @param target The target element containing elements to be upgraded.
 */
const forceUpgradeCustomElements = (target: Element) => {
  target.querySelectorAll<Element>('[is]').forEach((node) => {
    // Probably this node is already a custom element by the explicit node name
    if (node.nodeName.includes('-')) return

    // Check if the node has a different constructor from the browser
    const testElm = document.createElement(node.nodeName)
    if (testElm.constructor !== node.constructor) return

    // The node intents to use the custom element by `is` but not upgraded!
    const { outerHTML } = node
    node.outerHTML = outerHTML

    console.debug(
      '[marp-vscode] Custom element has been upgraded forcibly:',
      outerHTML.slice(0, outerHTML.indexOf('>') + 1 || undefined)
    )
  })
}

const removeStyles = () => {
  const styles = document.querySelectorAll<HTMLStyleElement>(
    'style:not(#__marp-vscode-style):not(#_defaultStyles):not([data-marp-vscode-body])'
  )
  const links = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="stylesheet"][href]:not([href*="marp-vscode"])'
  )

  styles.forEach((elm) => {
    if (elm.closest('#__marp-vscode')) return
    elm.dataset.marpVscodeBody = elm.textContent ?? ''
    elm.textContent = ''
  })

  links.forEach((elm) => {
    if (elm.closest('#__marp-vscode')) return
    const { href } = elm
    elm.dataset.marpVscodeHref = href
    elm.removeAttribute('href')
  })
}

const restoreStyles = () => {
  const styles = document.querySelectorAll<HTMLStyleElement>(
    'style[data-marp-vscode-body]'
  )
  const links = document.querySelectorAll<HTMLLinkElement>(
    'link[data-marp-vscode-href]'
  )

  styles.forEach((elm) => {
    elm.textContent = elm.dataset.marpVscodeBody || ''
    delete elm.dataset.marpVscodeBody
  })

  links.forEach((elm) => {
    elm.href = elm.dataset.marpVscodeHref || ''
    delete elm.dataset.marpVscodeHref
  })
}
