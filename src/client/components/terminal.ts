import { LitElement, css, html, PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Disposable, TerminalDimensions } from 'vscode'
import { ITheme, Terminal as XTermJS } from 'xterm'
import { SerializeAddon } from 'xterm-addon-serialize'
import { Unicode11Addon } from 'xterm-addon-unicode11'
import { WebLinksAddon } from 'xterm-addon-web-links'

import { FitAddon, type ITerminalDimensions } from '../fitAddon'
import { ClientMessages } from '../../constants'
import { getContext } from '../utils'
import { onClientMessage, postClientMessage } from '../../utils/messaging'
import { stripANSI } from '../../utils/ansi'

interface IWindowSize {
  width: number
  height: number
}

const vscodeCSS = (...identifiers: string[]) => `--vscode-${identifiers.join('-')}`
const terminalCSS = (id: string) => vscodeCSS('terminal', id)
const toAnsi = (id: string) => `ansi${id.charAt(0).toUpperCase() + id.slice(1)}`
const LISTEN_TO_EVENTS = ['terminal:', 'theme:']

const ANSI_COLORS = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',

  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite',
] satisfies (keyof ITheme)[]

@customElement('terminal-view')
export class TerminalView extends LitElement {
  static styles = css`
    .xterm {
      cursor: text;
      position: relative;
      padding: 10px;
      user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
    }

    .xterm.focus,
    .xterm:focus {
        border: solid 1px var(--vscode-focusBorder);
    }

    .xterm .xterm-helpers {
        position: absolute;
        top: 0;
        /**
         * The z-index of the helpers must be higher than the canvases in order for
         * IMEs to appear on top.
         */
        z-index: 5;
    }

    .xterm .xterm-helper-textarea {
        padding: 0;
        border: 0;
        margin: 0;
        /* Move textarea out of the screen to the far left, so that the cursor is not visible */
        position: absolute;
        opacity: 0;
        left: -9999em;
        top: 0;
        width: 0;
        height: 0;
        z-index: -5;
        /** Prevent wrapping so the IME appears against the textarea at the correct position */
        white-space: nowrap;
        overflow: hidden;
        resize: none;
    }

    .xterm .composition-view {
        color: #FFF;
        display: none;
        position: absolute;
        white-space: nowrap;
        z-index: 1;
    }

    .xterm .composition-view.active {
        display: block;
    }

    .xterm .xterm-viewport {
        background-color: var(${unsafeCSS(terminalCSS('background'))}) !important;
        border: solid 1px var(--vscode-terminal-border);
        /* On OS X this is required in order for the scroll bar to appear fully opaque */
        overflow-y: scroll;
        cursor: default;
        position: absolute;
        right: 0;
        left: 0;
        top: 0;
        bottom: 0;
    }

    .xterm .xterm-screen {
        position: relative;
    }

    .xterm .xterm-screen canvas {
        position: absolute;
        left: 0;
        top: 0;
    }

    .xterm-viewport::-webkit-scrollbar {
      width: 10px;
    }

    .xterm-viewport::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0);
      min-height: 20px;
    }

    .xterm:hover .xterm-viewport::-webkit-scrollbar-thumb {
      background-color: var(${unsafeCSS(vscodeCSS('scrollbarSlider', 'background'))});
    }

    .xterm:hover .xterm-viewport::-webkit-scrollbar-thumb:hover {
      background-color: var(${unsafeCSS(vscodeCSS('scrollbarSlider', 'hoverBackground'))});
    }

    .xterm:hover .xterm-viewport::-webkit-scrollbar-thumb:active {
      background-color: var(${unsafeCSS(vscodeCSS('scrollbarSlider', 'activeBackground'))});
    }

    .xterm .xterm-scroll-area {
        visibility: hidden;
    }

    .xterm-char-measure-element {
        display: inline-block;
        visibility: hidden;
        position: absolute;
        top: 0;
        left: -9999em;
        line-height: normal;
    }

    .xterm.enable-mouse-events {
        /* When mouse events are enabled (eg. tmux), revert to the standard pointer cursor */
        cursor: default;
    }

    .xterm.xterm-cursor-pointer,
    .xterm .xterm-cursor-pointer {
        cursor: pointer;
    }

    .xterm.column-select.focus {
        /* Column selection mode */
        cursor: crosshair;
    }

    .xterm .xterm-accessibility,
    .xterm .xterm-message {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        z-index: 10;
        color: transparent;
    }

    .xterm .live-region {
        position: absolute;
        left: -9999px;
        width: 1px;
        height: 1px;
        overflow: hidden;
    }

    .xterm-dim {
        opacity: 0.5;
    }

    .xterm-underline-1 { text-decoration: underline; }
    .xterm-underline-2 { text-decoration: double underline; }
    .xterm-underline-3 { text-decoration: wavy underline; }
    .xterm-underline-4 { text-decoration: dotted underline; }
    .xterm-underline-5 { text-decoration: dashed underline; }

    .xterm-strikethrough {
        text-decoration: line-through;
    }

    .xterm-screen .xterm-decoration-container .xterm-decoration {
      z-index: 6;
      position: absolute;
    }

    .xterm-decoration-overview-ruler {
        z-index: 7;
        position: absolute;
        top: 0;
        right: 0;
        pointer-events: none;
    }

    .xterm-decoration-top {
        z-index: 2;
        position: relative;
    }

    vscode-button {
      background: transparent;
      color: #ccc;
      transform: scale(.9);
    }
    vscode-button:hover {
      background: var(--button-secondary-background);
    }
    vscode-button:focus {
      outline: #007fd4 1px solid;
    }
    .icon {
      width: 13px;
      margin: 0 5px 0 -5px;
      padding: 0;
    }

    .button-group {
      display: flex;
      flex-direction: row;
      justify-content: end;
    }

    section {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .xterm-drag-handle {
      width: 100%;
      position: absolute;
      bottom: -5px;
      height: 10px;
      cursor: row-resize;
    }

    #terminal {
      position: relative;
    }
  `

  protected disposables: Disposable[] = []
  protected terminal?: XTermJS
  protected fitAddon?: FitAddon
  protected serializer?: SerializeAddon
  protected windowSize: IWindowSize

  protected rows: number = 10

  @property({ type: String })
  uuid?: string

  @property({ type: String })
  terminalFontFamily?: string

  @property({ type: Number })
  terminalFontSize?: number

  @property({ type: String })
  initialContent?: string

  @property({ type: Number })
  initialRows?: number

  @property({ type: Number })
  lastLine?: number // TODO: Get the last line of the terminal and store it.

  constructor() {
    super()
    this.windowSize = {
      height: window.innerHeight,
      width: window.innerWidth
    }
  }

  connectedCallback(): void {
    super.connectedCallback()

    if (!this.uuid) {
      throw new Error('No uuid provided to terminal!')
    }

    this.rows = this.initialRows ?? this.rows

    this.terminal = new XTermJS({
      rows: this.rows,
      cursorBlink: true,
      fontSize: this.terminalFontSize,
      cursorStyle: 'bar',
      disableStdin: false,
      convertEol: true,
      allowProposedApi: true,
      fontFamily: this.terminalFontFamily,
      drawBoldTextInBrightColors: false,
    })

    if (this.initialContent) {
      this.terminal?.write(this.initialContent)
    }

    this.fitAddon = new FitAddon()
    this.fitAddon.activate(this.terminal!)

    this.serializer = new SerializeAddon()
    this.terminal.loadAddon(this.serializer)
    this.terminal.loadAddon(new Unicode11Addon())
    this.terminal.loadAddon(new WebLinksAddon(this.#onWebLinkClick.bind(this)))
    this.terminal.unicode.activeVersion = '11'
    this.terminal.options.drawBoldTextInBrightColors

    const ctx = getContext()

    window.addEventListener('resize', this.#onResizeWindow.bind(this))

    this.disposables.push(
      onClientMessage(ctx, (e) => {
        if (!LISTEN_TO_EVENTS.some(event => e.type.startsWith(event))) { return }

        switch (e.type) {
          case ClientMessages.activeThemeChanged:
            this.#updateTerminalTheme()
            break
          case ClientMessages.terminalStdout:
          case ClientMessages.terminalStderr: {
            const { 'runme.dev/uuid': uuid, data } = e.output
            if (uuid !== this.uuid) { return }
            if (e.type === ClientMessages.terminalStdout) {
              this.terminal!.write(data)
            }
          } break
        }
      }),
      this.terminal.onData((data) => postClientMessage(ctx, ClientMessages.terminalStdin, {
        'runme.dev/uuid': this.uuid!,
        input: data
      }))
    )
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.dispose()
    window.removeEventListener('resize', this.#onResizeWindow)
  }

  protected firstUpdated(props: PropertyValues): void {
    super.firstUpdated(props)
    const terminalContainer = this.#getTerminalElement() as HTMLElement

    window.addEventListener('focus', () => { this.#onFocusWindow() })
    window.addEventListener('click', () => { this.#onFocusWindow(false) })

    this.terminal!.open(terminalContainer)
    this.terminal!.focus()
    this.#resizeTerminal()
    this.#updateTerminalTheme()

    terminalContainer.appendChild(this.#createResizeHandle())

    const ctx = getContext()
    ctx.postMessage && postClientMessage(ctx, ClientMessages.terminalOpen, {
      'runme.dev/uuid': this.uuid!,
      terminalDimensions: convertXTermDimensions(
        this.fitAddon?.proposeDimensions()
      )
    })

    if (this.lastLine) {
      this.terminal!.scrollToLine(this.lastLine)
    }
  }

  #resizeTerminal(rows?: number) {
    if (rows !== undefined) { this.rows = rows }
    return this.fitAddon?.fit(this.rows)
  }

  #createResizeHandle(): HTMLElement {
    const dragHandle = document.createElement('div')
    dragHandle.setAttribute('class', 'xterm-drag-handle')

    let dragState: {
      initialClientY: number
      initialRows: number
    } | undefined

    dragHandle.addEventListener('mousedown', (e) => {
      dragState = {
        initialClientY: e.clientY,
        initialRows: this.rows
      }
    })

    window.addEventListener('mouseup', () => {
      if (dragState === undefined) { return }
      dragState = undefined
    })

    window.addEventListener('mousemove', (e) => {
      if (dragState === undefined || !this.fitAddon) { return }

      const delta = e.clientY - dragState.initialClientY

      console.log({ delta, cellHeight: this.fitAddon.getCellSize().height })

      const deltaRows = delta / this.fitAddon.getCellSize().height
      const newRows = Math.round(dragState.initialRows + deltaRows)

      if (newRows !== this.rows) {
        this.#resizeTerminal(newRows)
      }
    })

    return dragHandle
  }

  #getTerminalElement(): Element {
    return this.shadowRoot?.querySelector('#terminal')!
  }

  #updateTerminalTheme(): void {
    const foregroundColor = this.#getThemeHexColor(terminalCSS('foreground'))

    const terminalTheme: ITheme = {
      foreground: foregroundColor,
      cursor: this.#getThemeHexColor(vscodeCSS('terminalCursor', 'foreground')) || foregroundColor,
      cursorAccent: this.#getThemeHexColor(vscodeCSS('terminalCursor', 'background')),
      selectionForeground: this.#getThemeHexColor(terminalCSS('selectionForeground')),
      selectionBackground: this.#getThemeHexColor(terminalCSS('selectionBackground')),
      selectionInactiveBackground: this.#getThemeHexColor(terminalCSS('inactiveSelectionBackground')),
      ...(Object.fromEntries(
        ANSI_COLORS.map(k => [k, this.#getThemeHexColor(terminalCSS(toAnsi(k)))] as const)
      )),
    }
    this.terminal!.options.theme = terminalTheme
  }

  #getThemeHexColor(variableName: string): string | undefined {
    const terminalContainer = this.shadowRoot?.querySelector('#terminal')
    return getComputedStyle(terminalContainer!).getPropertyValue(variableName) ?? undefined
  }

  async #onResizeWindow(): Promise<void> {
    if (!this.fitAddon) { return }

    const { innerWidth } = window

    // Prevent adjusting the terminal size if the width remains the same
    if (Math.abs(this.windowSize.width - innerWidth) <= Number.EPSILON) {
      return
    }

    this.windowSize.width = innerWidth

    const proposedDimensions = this.#resizeTerminal()

    if (proposedDimensions) {
      const ctx = getContext()
      if (!ctx.postMessage) { return }

      await postClientMessage(ctx, ClientMessages.terminalResize, {
        'runme.dev/uuid': this.uuid!,
        terminalDimensions: convertXTermDimensions(proposedDimensions)
      })
    }
  }

  async #onFocusWindow(focusTerminal = true): Promise<void> {
    if (focusTerminal) {
      this.terminal?.focus()
    }

    const ctx = getContext()
    if (!ctx.postMessage) { return }

    await postClientMessage(ctx, ClientMessages.terminalFocus, {
      'runme.dev/uuid': this.uuid!
    })
  }

  #onWebLinkClick(event: MouseEvent, uri: string): void {
    postClientMessage(getContext(), ClientMessages.openLink, uri)
  }

  // Render the UI as a function of component state
  render() {
    return html`<section>
      <div id="terminal"></div>
      <div class="button-group">
        <vscode-button appearance="secondary" @click="${this.#copy.bind(this)}">
          <svg
            class="icon" width="16" height="16" viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg" fill="currentColor"
          >
            <path fill-rule="evenodd" clip-rule="evenodd"
              d="M4 4l1-1h5.414L14 6.586V14l-1 1H5l-1-1V4zm9 3l-3-3H5v10h8V7z"/>
            <path fill-rule="evenodd" clip-rule="evenodd"
              d="M3 1L2 2v10l1 1V2h6.414l-1-1H3z"/>
          </svg>
          Copy
        </vscode-button>
      </div>
    </section>`
  }

  dispose() {
    this.disposables.forEach(({ dispose }) => dispose())
  }

  #copy() {
    const ctx = getContext()
    if (!ctx.postMessage) { return }

    const content = stripANSI(this.serializer?.serialize({ excludeModes: true, excludeAltBuffer: true }) ?? '')

    return navigator.clipboard.writeText(content).then(
      () => postClientMessage(ctx, ClientMessages.infoMessage, 'Copied result content to clipboard!'),
      (err) => postClientMessage(ctx, ClientMessages.infoMessage, `'Failed to copy to clipboard: ${err.message}!'`),
    )
  }
}

function convertXTermDimensions(dimensions: ITerminalDimensions): TerminalDimensions
function convertXTermDimensions(dimensions: undefined): undefined
function convertXTermDimensions(dimensions: ITerminalDimensions|undefined): TerminalDimensions|undefined
function convertXTermDimensions(dimensions?: ITerminalDimensions): TerminalDimensions|undefined {
  if (!dimensions) { return undefined }

  const { rows, cols } = dimensions
  return { columns: cols, rows }
}
