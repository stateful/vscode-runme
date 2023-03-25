import { LitElement, css, html, PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Disposable } from 'vscode'
import { ITheme, Terminal as XTermJS } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { SerializeAddon } from 'xterm-addon-serialize'
import { Unicode11Addon } from 'xterm-addon-unicode11'

import { ClientMessages } from '../../constants'
import { getContext } from '../utils'
import { onClientMessage, postClientMessage } from '../../utils/messaging'


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
]satisfies (keyof ITheme)[]

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
  `

  protected disposables: Disposable[] = []
  protected terminal?: XTermJS
  protected fitAddon?: FitAddon
  protected serializer?: SerializeAddon
  protected windowSize: IWindowSize

  @property({ type: String })
  uuid?: string

  @property({ type: String })
  terminalFontFamily?: string

  @property({ type: Number })
  terminalFontSize?: number

  @property({ type: String })
  initialContent?: string

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

    this.terminal = new XTermJS({
      rows: 10,
      cursorBlink: true,
      fontSize: this.terminalFontSize,
      cursorStyle: 'bar',
      scrollOnUserInput: true,
      convertEol: this.initialContent ? true : false,
      disableStdin: this.initialContent ? true : false,
      allowProposedApi: true,
      fontFamily: this.terminalFontFamily,
      drawBoldTextInBrightColors: false,
    })

    this.fitAddon = new FitAddon()
    this.serializer = new SerializeAddon()
    const unicode11Addon = new Unicode11Addon()
    this.terminal.loadAddon(this.fitAddon)
    this.terminal.loadAddon(this.serializer)
    this.terminal.loadAddon(unicode11Addon)
    this.terminal.unicode.activeVersion = '11'
    this.terminal.options.drawBoldTextInBrightColors

    const ctx = getContext()

    window.addEventListener('resize', this.#onResizeWindow)


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
    const terminalContainer = this.#getTerminalElement()
    this.terminal!.open(terminalContainer as HTMLElement)
    this.terminal!.focus()
    this.fitAddon?.fit()
    this.#updateTerminalTheme()

    if (this.initialContent) {
      this.terminal?.write(this.initialContent)
    }

    if (this.lastLine) {
      this.terminal!.scrollToLine(this.lastLine)
    }
  }

  #getTerminalElement(): Element {
    return this.shadowRoot?.querySelector('#terminal')!
  }

  #updateTerminalTheme(): void {
    const terminalTheme: ITheme = {
      foreground: this.#getThemeHexColor(terminalCSS('foreground')),
      cursor: this.#getThemeHexColor(vscodeCSS('terminalCursor', 'foreground')),
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

  #onResizeWindow(): void {
    const { innerWidth } = window
    // Prevent adjusting the terminal size if the width remains the same
    if (this.windowSize.width !== innerWidth) {
      this.windowSize.width = innerWidth
      this.fitAddon?.fit()
    }
  }

  // Render the UI as a function of component state
  render() {
    return html`<div id="terminal"></div>`
  }

  dispose() {
    this.disposables.forEach(({ dispose }) => dispose())
  }

}
