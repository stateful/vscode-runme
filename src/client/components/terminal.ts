import { LitElement, css, html, PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Disposable } from 'vscode'
import { ITheme, Terminal as XTermJS } from 'xterm'

import { ClientMessages } from '../../constants'
import { getContext } from '../utils'
import { onClientMessage, postClientMessage } from '../../utils/messaging'

const vscodeCSS = (...identifiers: string[]) => `var(--vscode-${identifiers.join('-')})`
const terminalCSS = (id: string) => vscodeCSS('terminal', id)
const toAnsi = (id: string) => `ansi${id.charAt(0).toUpperCase() + id.slice(1)}`

const ansiColors = [
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

const xtermjsThemeVscode: ITheme = {
  background: terminalCSS('background'),
  foreground: terminalCSS('foreground'),

  ...(Object.fromEntries(
    ansiColors.map(k => [k, terminalCSS(`ansi${k.charAt(0).toUpperCase() + k.slice(1)}`)] as const)
  ) as Record<keyof typeof ansiColors, string>),

  cursor: vscodeCSS('terminalCursor', 'foreground'),
  cursorAccent: vscodeCSS('terminalCursor', 'background'),

  selectionBackground: terminalCSS('selectionBackground'),
  selectionForeground: terminalCSS('selectionForeground'),
  selectionInactiveBackground: terminalCSS('inactiveSelectionBackground'),
}

@customElement('terminal-view')
export class TerminalView extends LitElement {
  // TODO: use `var(--vscode-terminal-border)` for terminal border
  static styles = css`
    ${
      unsafeCSS(
        ansiColors.map((v, i) => `
        .xterm-fg-${i} {
          color: ${terminalCSS(toAnsi(v))} !important;
        }

        .xterm-bg-${i} {
          background-color: ${terminalCSS(toAnsi(v))} !important;
        }
        `.trim()).join('\n\n')
      )
    }

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
        outline: none;
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
        background: #000;
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
        color: ${unsafeCSS(terminalCSS('foreground'))} !important;
        background-color: ${unsafeCSS(terminalCSS('background'))} !important;

        border: 1px solid ${unsafeCSS(terminalCSS('border'))};

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

  @property({ type: String })
  uuid?: string

  #dispatch() {
    const ctx = getContext()
    if (!ctx.postMessage) {
      return
    }
  }

  connectedCallback(): void {
    super.connectedCallback()

    if(!this.uuid) {
      throw new Error('No uuid provided to terminal!')
    }

    console.log(xtermjsThemeVscode)

    this.terminal = new XTermJS({
      rows: 10,
      // cols: 20,
      cursorBlink: true,
      cursorStyle: 'bar',
      disableStdin: false,
      allowProposedApi: true,
      theme: xtermjsThemeVscode,
      fontFamily: '"Fira Code", courier-new, courier, monospace, "Powerline Extra Symbols"',
    })

    const ctx = getContext()

    this.disposables.push(
      onClientMessage(ctx, (e) => {
        if (!e.type.startsWith('terminal:')) { return }

        switch (e.type) {
          case ClientMessages.terminalStdout:
          case ClientMessages.terminalStderr: {
            const { 'runme.dev/uuid': uuid, data } = e.output

            // console.log({ uuid, cellUUID: this.uuid, eq: uuid === this.uuid })
            if (uuid !== this.uuid) { return }

            // eslint-disable-next-line max-len
            // console.log({ type: e.type, against: ClientMessages.terminalStdout, eq: e.type === ClientMessages.terminalStdout })
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
    this.dispose()
  }

  protected firstUpdated(props: PropertyValues): void {
    super.firstUpdated(props)

    const terminalContainer = this.shadowRoot?.querySelector('#terminal')

    if (terminalContainer) {
      this.terminal!.focus()
      this.terminal!.open(terminalContainer as HTMLElement)
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
