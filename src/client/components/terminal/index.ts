import { LitElement, css, html, PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Disposable, TerminalDimensions } from 'vscode'
import { ITheme, Terminal as XTermJS } from 'xterm'
import { SerializeAddon } from 'xterm-addon-serialize'
import { Unicode11Addon } from 'xterm-addon-unicode11'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { when } from 'lit/directives/when.js'

import { FitAddon, type ITerminalDimensions } from '../../fitAddon'
import { ClientMessages, RENDERERS, OutputType, WebViews } from '../../../constants'
import { closeOutput, getContext } from '../../utils'
import { onClientMessage, postClientMessage } from '../../../utils/messaging'
import { stripANSI } from '../../../utils/ansi'
import { APIMethod } from '../../../types'
import type { TerminalConfiguration } from '../../../utils/configuration'

import '../closeCellButton'
import '../copyButton'
import './share'

interface IWindowSize {
  width: number
  height: number
}

enum MessageOptions {
  OpenLink = 'Open',
  CopyToClipboard = 'Copy to clipboard',
  Cancel = 'Cancel',
}

const vscodeCSS = (...identifiers: string[]) => `--vscode-${identifiers.join('-')}`
const terminalCSS = (id: string) => vscodeCSS('terminal', id)
const toAnsi = (id: string) => `ansi${id.charAt(0).toUpperCase() + id.slice(1)}`
const LISTEN_TO_EVENTS = [
  'terminal:',
  'theme:',
  ClientMessages.cloudApiRequest,
  ClientMessages.cloudApiResponse,
  ClientMessages.onOptionsMessage,
  ClientMessages.optionsMessage,
  ClientMessages.onCopyTextToClipboard,
  ClientMessages.onProgramClose,
]

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

@customElement(RENDERERS.TerminalView)
export class TerminalView extends LitElement {
  protected copyText = 'Copy'
  protected shareText = 'Save'
  protected saveText = 'Save'
  protected shareEnabledText = 'Share'

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
      color: #fff;
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

    .xterm-underline-1 {
      text-decoration: underline;
    }
    .xterm-underline-2 {
      text-decoration: double underline;
    }
    .xterm-underline-3 {
      text-decoration: wavy underline;
    }
    .xterm-underline-4 {
      text-decoration: dotted underline;
    }
    .xterm-underline-5 {
      text-decoration: dashed underline;
    }

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
      color: var(--vscode-button-foreground);
      background-color: var(--vscode-button-background);
      transform: scale(0.9);
    }
    vscode-button:hover {
      background: var(--vscode-button-hoverBackground);
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
      position: relative;
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
  fontFamily?: TerminalConfiguration['fontFamily']

  @property({ type: Number })
  fontSize?: TerminalConfiguration['fontSize']

  @property({ type: String })
  cursorStyle?: TerminalConfiguration['cursorStyle']

  @property({ type: Boolean })
  cursorBlink?: TerminalConfiguration['cursorBlink']

  @property({ type: Number })
  cursorWidth?: TerminalConfiguration['cursorWidth']

  @property({ type: Number })
  smoothScrollDuration?: TerminalConfiguration['smoothScrollDuration']

  @property({ type: Number })
  scrollback?: TerminalConfiguration['scrollback']

  @property({ type: String })
  initialContent?: string

  @property({ type: Number })
  initialRows?: number

  @property({ type: Number })
  lastLine?: number // TODO: Get the last line of the terminal and store it.

  @property({ type: Boolean })
  isCloudApiLoading: boolean = false

  @property()
  cloudId?: string

  @property()
  shareUrl?: string

  @property({ type: Boolean })
  enableShareButton: boolean = false

  @property({ type: Boolean })
  isShareReady: boolean = false

  @property({ type: Boolean })
  isUpdatedReady: boolean = false

  @property({ type: Boolean })
  isAutoSaveEnabled: boolean = false

  constructor() {
    super()
    this.windowSize = {
      height: window.innerHeight,
      width: window.innerWidth,
    }
  }

  connectedCallback(): void {
    super.connectedCallback()

    if (!this.uuid) {
      throw new Error('No uuid provided to terminal!')
    }

    this.rows = this.initialRows ?? this.rows

    const {
      rows,
      cursorBlink,
      fontSize,
      cursorStyle,
      cursorWidth,
      fontFamily,
      smoothScrollDuration,
      scrollback,
    } = this
    this.terminal = new XTermJS({
      rows,
      fontSize,
      fontFamily,
      scrollback,
      cursorWidth,
      cursorBlink,
      cursorStyle,
      smoothScrollDuration,
      disableStdin: false,
      convertEol: true,
      allowProposedApi: true,
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
      onClientMessage(ctx, async (e) => {
        if (!LISTEN_TO_EVENTS.some((event) => e.type.startsWith(event))) {
          return
        }

        switch (e.type) {
          case ClientMessages.activeThemeChanged:
            this.#updateTerminalTheme()
            break
          case ClientMessages.terminalStdout:
          case ClientMessages.terminalStderr:
            {
              const { 'runme.dev/uuid': uuid, data } = e.output
              if (uuid !== this.uuid) {
                return
              }
              if (e.type === ClientMessages.terminalStdout) {
                this.shareText = this.isAutoSaveEnabled ? this.shareEnabledText : this.saveText
                this.isShareReady = false
                this.terminal!.write(data)
                this.requestUpdate()
              }
            }
            break
          case ClientMessages.cloudApiResponse:
            {
              if (e.output.uuid !== this.uuid) {
                return
              }
              this.isCloudApiLoading = false
              if (e.output.hasErrors) {
                return postClientMessage(ctx, ClientMessages.errorMessage, e.output.data)
              }
              const { data } = e.output.data
              if (data.createCellExecution) {
                const {
                  createCellExecution: { id, htmlUrl },
                } = data
                this.cloudId = id
                this.shareUrl = htmlUrl
                this.shareText = this.shareEnabledText
                this.isShareReady = true
                // Dispatch tangle update event
                return postClientMessage(ctx, ClientMessages.tangleEvent, {
                  webviewId: WebViews.RunmeCloud,
                  data: {
                    cellId: id,
                  },
                })
              }
              if (data.updateCellExecution) {
                this.isUpdatedReady = true
                this.#displayShareDialog()
              }
            }
            break

          case ClientMessages.onOptionsMessage:
            {
              if (e.output.uuid !== this.uuid) {
                return
              }
              const answer = e.output.option
              this.isCloudApiLoading = false
              switch (answer) {
                case MessageOptions.OpenLink: {
                  return postClientMessage(ctx, ClientMessages.openExternalLink, {
                    link: this.shareUrl!,
                    telemetryEvent: 'app.openLink',
                  })
                }
                case MessageOptions.CopyToClipboard: {
                  return postClientMessage(ctx, ClientMessages.copyTextToClipboard, {
                    uuid: this.uuid!,
                    text: this.shareUrl!,
                  })
                }
              }
            }
            break
          case ClientMessages.onCopyTextToClipboard: {
            if (e.output.uuid !== this.uuid) {
              return
            }
            return postClientMessage(ctx, ClientMessages.infoMessage, 'Link copied!')
          }
          case ClientMessages.onProgramClose: {
            const { 'runme.dev/uuid': uuid } = e.output
            if (uuid !== this.uuid || !this.isAutoSaveEnabled) {
              return
            }
            return this.#shareCellOutput()
          }
        }
      }),
      this.terminal.onData((data) =>
        postClientMessage(ctx, ClientMessages.terminalStdin, {
          'runme.dev/uuid': this.uuid!,
          input: data,
        }),
      ),
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

    window.addEventListener('focus', () => {
      this.#onFocusWindow()
    })
    window.addEventListener('click', () => {
      this.#onFocusWindow(false)
    })

    this.terminal!.open(terminalContainer)
    this.terminal!.focus()
    this.#resizeTerminal()
    this.#updateTerminalTheme()

    terminalContainer.appendChild(this.#createResizeHandle())

    const ctx = getContext()
    ctx.postMessage &&
      postClientMessage(ctx, ClientMessages.terminalOpen, {
        'runme.dev/uuid': this.uuid!,
        terminalDimensions: convertXTermDimensions(this.fitAddon?.proposeDimensions()),
      })

    if (this.lastLine) {
      this.terminal!.scrollToLine(this.lastLine)
    }
  }

  #resizeTerminal(rows?: number) {
    if (rows !== undefined) {
      this.rows = rows
    }
    return this.fitAddon?.fit(this.rows)
  }

  #createResizeHandle(): HTMLElement {
    const dragHandle = document.createElement('div')
    dragHandle.setAttribute('class', 'xterm-drag-handle')

    let dragState:
      | {
          initialClientY: number
          initialRows: number
        }
      | undefined

    const onMouseDown = (e: MouseEvent) => {
      dragState = {
        initialClientY: e.clientY,
        initialRows: this.rows,
      }
      e.preventDefault()
      this.terminal?.focus()
    }

    const onMouseUp = () => {
      if (dragState === undefined) {
        return
      }
      dragState = undefined
    }

    const onMouseMove = (e: MouseEvent) => {
      if (dragState === undefined || !this.fitAddon) {
        return
      }

      const delta = e.clientY - dragState.initialClientY

      const deltaRows = delta / this.fitAddon.getCellSize().height
      const newRows = Math.round(dragState.initialRows + deltaRows)

      if (newRows !== this.rows) {
        this.#resizeTerminal(newRows)
        this.terminal?.focus()
      }
    }

    dragHandle.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)

    this.disposables.push({
      dispose: () => {
        dragHandle.removeEventListener('mousedown', onMouseDown)
        window.removeEventListener('mouseup', onMouseUp)
        window.removeEventListener('mousemove', onMouseMove)
      },
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
      selectionInactiveBackground: this.#getThemeHexColor(
        terminalCSS('inactiveSelectionBackground'),
      ),
      ...Object.fromEntries(
        ANSI_COLORS.map((k) => [k, this.#getThemeHexColor(terminalCSS(toAnsi(k)))] as const),
      ),
    }
    this.terminal!.options.theme = terminalTheme
  }

  #getThemeHexColor(variableName: string): string | undefined {
    const terminalContainer = this.shadowRoot?.querySelector('#terminal')
    return getComputedStyle(terminalContainer!).getPropertyValue(variableName) ?? undefined
  }

  async #onResizeWindow(): Promise<void> {
    if (!this.fitAddon) {
      return
    }

    const { innerWidth } = window

    // Prevent adjusting the terminal size if the width remains the same
    if (Math.abs(this.windowSize.width - innerWidth) <= Number.EPSILON) {
      return
    }

    this.windowSize.width = innerWidth

    const proposedDimensions = this.#resizeTerminal()

    if (proposedDimensions) {
      const ctx = getContext()
      if (!ctx.postMessage) {
        return
      }

      await postClientMessage(ctx, ClientMessages.terminalResize, {
        'runme.dev/uuid': this.uuid!,
        terminalDimensions: convertXTermDimensions(proposedDimensions),
      })
    }
  }

  async #onFocusWindow(focusTerminal = true): Promise<void> {
    if (focusTerminal) {
      this.terminal?.focus()
    }

    const ctx = getContext()
    if (!ctx.postMessage) {
      return
    }

    await postClientMessage(ctx, ClientMessages.terminalFocus, {
      'runme.dev/uuid': this.uuid!,
    })
  }

  async #displayShareDialog(): Promise<boolean | void> {
    const ctx = getContext()
    if (!ctx.postMessage || !this.shareUrl) {
      return
    }
    this.shareText = this.shareEnabledText
    this.isShareReady = true
    return postClientMessage(ctx, ClientMessages.optionsMessage, {
      title:
        'Please share link with caution. Anyone with the link has access. Click "Open" to toggle visibility.',
      options: Object.values(MessageOptions),
      uuid: this.uuid!,
      telemetryEvent: 'app.share',
    })
  }

  async #shareCellOutput(): Promise<boolean | void | undefined> {
    const ctx = getContext()
    if (!ctx.postMessage) {
      return
    }
    try {
      if (this.isUpdatedReady) {
        return this.#displayShareDialog()
      }
      if (this.isShareReady) {
        this.isCloudApiLoading = true
        await postClientMessage(ctx, ClientMessages.cloudApiRequest, {
          data: {
            id: this.cloudId,
          },
          uuid: this.uuid!,
          method: APIMethod.UpdateCellExecution,
        })
        return
      }

      this.isCloudApiLoading = true
      const contentWithAnsi =
        this.serializer?.serialize({ excludeModes: true, excludeAltBuffer: true }) ?? ''
      await postClientMessage(ctx, ClientMessages.cloudApiRequest, {
        data: {
          stdout: contentWithAnsi,
        },
        uuid: this.uuid!,
        method: APIMethod.CreateCellExecution,
      })
    } catch (error) {
      this.isCloudApiLoading = false
      postClientMessage(
        ctx,
        ClientMessages.infoMessage,
        `Failed to share output: ${(error as any).message}`,
      )
    }
  }

  #onWebLinkClick(event: MouseEvent, uri: string): void {
    postClientMessage(getContext(), ClientMessages.openLink, uri)
  }

  // Render the UI as a function of component state
  render() {
    return html`<section>
      <div id="terminal"></div>
      <close-cell-button
        @closed="${() => {
          return closeOutput({
            uuid: this.uuid!,
            outputType: OutputType.terminal,
          })
        }}"
      ></close-cell-button>
      <div class="button-group">
        <copy-button
          copyText="${this.copyText}"
          @onCopy="${async () => {
            return this.#copy()
          }}"
        ></copy-button>
        ${when(
          this.enableShareButton,
          () =>
            html` <share-cell
              ?disabled=${this.isCloudApiLoading}
              ?displayShareIcon=${this.isShareReady}
              shareText="${this.isCloudApiLoading ? 'Saving ...' : this.shareText}"
              @onShare="${this.#shareCellOutput}"
            >
            </share-cell>`,
          () => html``,
        )}
      </div>
    </section>`
  }

  dispose() {
    this.disposables.forEach(({ dispose }) => dispose())
  }

  #copy() {
    const ctx = getContext()
    if (!ctx.postMessage) {
      return
    }
    const content = stripANSI(
      this.serializer?.serialize({ excludeModes: true, excludeAltBuffer: true }) ?? '',
    )
    return navigator.clipboard
      .writeText(content)
      .then(() => {
        this.copyText = 'Copied!'
        this.requestUpdate()
      })
      .catch((err) =>
        postClientMessage(
          ctx,
          ClientMessages.infoMessage,
          `Failed to copy to clipboard: ${err.message}!`,
        ),
      )
  }
}

function convertXTermDimensions(dimensions: ITerminalDimensions): TerminalDimensions
function convertXTermDimensions(dimensions: undefined): undefined
function convertXTermDimensions(
  dimensions: ITerminalDimensions | undefined,
): TerminalDimensions | undefined
function convertXTermDimensions(dimensions?: ITerminalDimensions): TerminalDimensions | undefined {
  if (!dimensions) {
    return undefined
  }

  const { rows, cols } = dimensions
  return { columns: cols, rows }
}
