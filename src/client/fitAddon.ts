/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

// Adjusted to use more direct method in cell size computation

import { Terminal, ITerminalAddon } from '@xterm/xterm'

interface IOffset {
  top: number
  left: number
}

interface IDimensions {
  width: number
  height: number
}

interface IRenderDimensions {
  /**
   * Dimensions measured in CSS pixels (ie. device pixels / device pixel ratio).
   */
  css: {
    canvas: IDimensions
    cell: IDimensions
  }
  /**
   * Dimensions measured in actual pixels as rendered to the device.
   */
  device: {
    canvas: IDimensions
    cell: IDimensions
    char: IDimensions & IOffset
  }
}

export interface ITerminalDimensions {
  /**
   * The number of rows in the terminal.
   */
  rows: number

  /**
   * The number of columns in the terminal.
   */
  cols: number
}

const MINIMUM_COLS = 2
const MINIMUM_ROWS = 1

export class FitAddon implements ITerminalAddon {
  private _terminal: Terminal | undefined

  constructor() {}

  public activate(terminal: Terminal): void {
    this._terminal = terminal
  }

  public dispose(): void {}

  public fit(overrideRows?: number): ITerminalDimensions | undefined {
    const dims = this.proposeDimensions()
    if (overrideRows !== undefined && dims) {
      dims.rows = overrideRows
    }

    if (!dims || !this._terminal || isNaN(dims.cols) || isNaN(dims.rows)) {
      return undefined
    }

    // TODO: Remove reliance on private API
    const core = (this._terminal as any)._core

    // Force a full render
    if (this._terminal.rows !== dims.rows || this._terminal.cols !== dims.cols) {
      core._renderService.clear()
      this._terminal.resize(dims.cols, dims.rows)
    }

    return dims
  }

  public proposeDimensions(): ITerminalDimensions | undefined {
    if (!this._terminal) {
      return undefined
    }

    if (!this._terminal.element || !this._terminal.element.parentElement) {
      return undefined
    }

    // TODO: Remove reliance on private API
    const core = this.getCore()
    const dims: IRenderDimensions = core._renderService.dimensions

    if (dims.css.cell.width === 0 || dims.css.cell.height === 0) {
      return undefined
    }

    const scrollbarWidth =
      this._terminal.options.scrollback === 0 ? 0 : core.viewport.scrollBarWidth

    const parentElementStyle = window.getComputedStyle(this._terminal.element.parentElement)
    const parentElementHeight = parseInt(parentElementStyle.getPropertyValue('height'))
    const parentElementWidth = Math.max(0, parseInt(parentElementStyle.getPropertyValue('width')))
    const elementStyle = window.getComputedStyle(this._terminal.element)
    const elementPadding = {
      top: parseInt(elementStyle.getPropertyValue('padding-top')),
      bottom: parseInt(elementStyle.getPropertyValue('padding-bottom')),
      right: parseInt(elementStyle.getPropertyValue('padding-right')),
      left: parseInt(elementStyle.getPropertyValue('padding-left')),
    }
    const elementPaddingVer = elementPadding.top + elementPadding.bottom
    const elementPaddingHor = elementPadding.right + elementPadding.left
    const availableHeight = parentElementHeight - elementPaddingVer
    const availableWidth = parentElementWidth - elementPaddingHor - scrollbarWidth

    const { width: cellWidth, height: cellHeight } = this.getCellSize()

    const geometry = {
      cols: Math.max(MINIMUM_COLS, Math.floor(availableWidth / cellWidth)),
      rows: Math.max(MINIMUM_ROWS, Math.floor(availableHeight / cellHeight)),
    }

    return geometry
  }

  getCellSize() {
    const { value: renderer } = this.getCore()._renderService._renderer

    return {
      width:
        renderer._charSizeService.width +
        Math.round(renderer._optionsService.rawOptions.letterSpacing),
      height: Math.floor(
        renderer._charSizeService.height * renderer._optionsService.rawOptions.lineHeight,
      ),
    }
  }

  private getCore() {
    return (this._terminal as any)._core
  }
}
