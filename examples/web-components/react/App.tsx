import React, { useState } from 'react'

import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'

import './App.css'

export default function App({ startCount }) {
  const [count, setCount] = useState(startCount || 0)

  return (
    <>
      {/* @ts-expect-error className vs class */}
      <div className="App">
        <div>
          <a href="https://vitejs.dev" target="_blank">
            {/* @ts-expect-error className vs class */}
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://reactjs.org" target="_blank">
            {/* @ts-expect-error className vs class */}
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1>Vite + React</h1>
        {/* @ts-expect-error className vs class */}
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>
        <p className="read-the-docs">
          Click on the Vite and React logos to learn more
        </p>
      </div>
    </>
  )
}
