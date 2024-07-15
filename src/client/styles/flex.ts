import { css } from 'lit'

export default css`
  .flex-container {
    display: flex;
  }

  .flex-row {
    display: flex;
    flex-direction: row;
  }

  .flex-column {
    display: flex;
    flex-direction: column;
  }

  .flex-justify-start {
    display: flex;
    justify-content: flex-start;
  }

  .flex-justify-center {
    display: flex;
    justify-content: center;
  }

  .flex-justify-end {
    display: flex;
    justify-content: flex-end;
  }

  .flex-justify-space-between {
    display: flex;
    justify-content: space-between;
  }

  .flex-justify-space-around {
    display: flex;
    justify-content: space-around;
  }

  .flex-align-start {
    display: flex;
    align-items: flex-start;
  }

  .flex-align-center {
    display: flex;
    align-items: center;
  }

  .flex-align-end {
    display: flex;
    align-items: flex-end;
  }

  .w-full {
    width: 100%;
  }
`
