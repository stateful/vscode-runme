import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Terminal } from 'xterm'

import { getContext } from '../utils'




@customElement('terminal-view')
export class TerminalView extends LitElement {
  // Define scoped styles right with your component, in plain CSS
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
    /* On OS X this is required in order for the scroll bar to appear fully opaque */
    background-color: #000;
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

  // Declare reactive properties
  @property({ type: Object, reflect: true })
  input?: string

  #dispatch() {
    const ctx = getContext()
    if (!ctx.postMessage) {
      return
    }
  }

  protected firstUpdated(): void {

    const xtermjsTheme = {
      foreground: '#F8F8F8',
      background: '#2D2E2C',
      selectionBackground: '#5DA5D533',
      black: '#1E1E1D',
      brightBlack: '#262625',
      red: '#CE5C5C',
      brightRed: '#FF7272',
      green: '#5BCC5B',
      brightGreen: '#72FF72',
      yellow: '#CCCC5B',
      brightYellow: '#FFFF72',
      blue: '#5D5DD3',
      brightBlue: '#7279FF',
      magenta: '#BC5ED1',
      brightMagenta: '#E572FF',
      cyan: '#5DA5D5',
      brightCyan: '#72F0FF',
      white: '#F8F8F8',
      brightWhite: '#FFFFFF'
    }

    const terminal = new Terminal({
      rows: 10,
      cols: 20,
      cursorBlink: true,
      cursorStyle: 'bar',
      disableStdin: false,
      allowProposedApi: true,
      theme: xtermjsTheme,
      fontFamily: '"Fira Code", courier-new, courier, monospace, "Powerline Extra Symbols"',

    })
    const terminalContainer = this.shadowRoot?.querySelector('#terminal')
    if (terminalContainer) {
      terminal.focus()
      terminal.open(terminalContainer as HTMLElement)
      terminal.writeln('hello world')
    }
  }

  // Render the UI as a function of component state
  render() {
    return html`<div id="terminal"></div>`
  }

}
