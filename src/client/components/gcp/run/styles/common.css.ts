import { css } from 'lit'

/* eslint-disable */
export default css`
  .error-message {
    padding: 1rem;
    border-radius: 5px;
    color: var(--vscode-errorForeground);
  }

  .current-region {
    display: flex;
    gap: 5px;
    padding: 0.5rem;
    justify-content: flex-start;
    align-items: center;
  }

  .bold {
    font-weight: bold;
  }

  table {
    box-sizing: border-box;
    margin: 0px;
    padding: 0px;
    font-weight: 400;
    line-height: 20px;
    text-indent: 0px;
    vertical-align: baseline;
  }

  .integration {
    display: flex;
    margin: 10px 0;
    gap: 2px;
    align-items: center;
  }

  .integration h1,
  h2,
  h3 {
    font-weight: 400;
  }

  .footer {
    display: flex;
    place-content: center flex-end;
    margin-top: 10px;
    align-items: baseline;
  }

  .footer .link {
    font-size: 10px;
    padding: 0 5px;
  }

  .vertical-left-divider {
    border-left: solid 1px var(--link-foreground);
    padding-left: 2px;
  }

  .close-button,
  .close-button:hover {
    border: none;
  }
`
