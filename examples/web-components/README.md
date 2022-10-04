# Web Components

With Runme you can develop web components directly in your notebook. Here are some examples from some of the popular front-end frameworks.

## Lit

Render demo component:

```html
<script src="/web-components/lit/example.ts" type="module"></script>
<my-element mood="awesome"></my-element>
```

## React

Render demo component:

```html
<div id="root"></div>
<script src="/web-components/react/main.tsx" type="module"></script>
```

## Vue

Render demo component:

```html
<div id="app"></div>
<script type="module" src="/web-components/vue/main.ts"></script>
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
