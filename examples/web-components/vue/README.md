# Vue

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

Allows rendering individual Vue components, e.g:

```html { framework=vue }
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
