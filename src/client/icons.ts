import { html } from 'lit'

export const COPY = html`<svg
  class="icon" width="16" height="16" viewBox="0 0 16 16"
  xmlns="http://www.w3.org/2000/svg" fill="currentColor"
>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M4 4l1-1h5.414L14 6.586V14l-1 1H5l-1-1V4zm9 3l-3-3H5v10h8V7z"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M3 1L2 2v10l1 1V2h6.414l-1-1H3z"/>
</svg>`

export const TERMINAL = html`<svg
  xmlns="http://www.w3.org/2000/svg" width="1em" height="1em"
  preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"
>
  <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"
    ${ /* eslint-disable-next-line max-len */ {} }
    d="M3 1.5L1.5 3v18L3 22.5h18l1.5-1.5V3L21 1.5H3zM3 21V3h18v18H3zm5.656-4.01l1.038 1.061l5.26-5.243v-.912l-5.26-5.26l-1.035 1.06l4.59 4.702l-4.593 4.592z"
  />
</svg>`

export const STOP = html`<svg
  xmlns="http://www.w3.org/2000/svg" width="1em" height="1em"
  preserveAspectRatio="xMidYMid meet" viewBox="0 0 16 16"
>
  <path fill="currentColor"
    ${ /* eslint-disable-next-line max-len */ {} }
    d="M8 1a7 7 0 1 1-7 7a7.008 7.008 0 0 1 7-7zM2 8c0 1.418.504 2.79 1.423 3.87l8.447-8.447A5.993 5.993 0 0 0 2 8zm12 0c0-1.418-.504-2.79-1.423-3.87L4.13 12.577A5.993 5.993 0 0 0 14 8z"
  />
</svg>`
