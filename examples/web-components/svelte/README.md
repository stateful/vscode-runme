# Svelte

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

### Individual Components

Allows rendering individual Vue components, e.g:

```html { framework=svelte }
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
