# Web Components

With Runme you can develop web components directly in your notebook. Here are some examples from some of the popular front-end frameworks.

## Lit

Render demo component:

```html
<script src="/web-components/lit/example.ts" type="module"></script>
<my-element mood="awesome"></my-element>
```

Render components directly:

```tsx
import '/web-components/lit/example.ts'

<my-element mood="awesome"></my-element>
```

## React

Render demo component:

```html
<div id="root"></div>
<script src="/web-components/react/main.tsx" type="module"></script>
```

Render components directly:

```tsx { framework=react }
import App from '/web-components/react/App.tsx'
import '/web-components/react/main.css'

<App startCount={42} />
```

Can render embedded components:

```tsx { framework=react }
import { EmbeddedComponent, EmbedTest } from '/web-components/react/Embed.tsx'

<div>
  <h1>Nested into other HTML</h1>
  <EmbedTest>
    <EmbeddedComponent />
  </EmbedTest>
</div>
```

## Vue

Render demo component:

```html
<div id="app"></div>
<script type="module" src="/web-components/vue/main.ts"></script>
```

Render component inline:

```tsx { framework=vue }
import HelloWorld from '/web-components/vue/components/HelloWorld.vue'
import '/web-components/vue/style.css'

<div id="app">
  <HelloWorld msg="Vite + Vue" />
</div>
```

### Individual Components
Allows rendering individual Svelte files.

```html
<script lang="ts">
  let count = 0
  const increment = () => {
    count += 1
  }
</script>

<button on:click={increment}>
  count is {count}
</button>
```

## Svelte

Render demo component:

```html
<div id="app"></div>
<script type="module" src="/web-components/svelte/main.ts"></script>
```

Render component inline:

```tsx { framework=svelte }
import Counter from '/web-components/svelte/lib/Counter.svelte'
import '/web-components/svelte/app.css'

<div class="card">
  <Counter />
</div>
```
