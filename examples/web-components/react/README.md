# React

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
