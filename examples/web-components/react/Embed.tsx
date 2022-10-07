import { ReactNode } from 'react'

export function EmbeddedComponent () {
  return (<i>Hello World</i>)
}

export function EmbedTest(prop: { children: ReactNode }) {
  return (
    <div>
      <h1>This is an embedded Component</h1>
      { prop.children }
    </div>
  )
}
