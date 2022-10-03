# Astro Starter Kit: Minimal

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

Installs dependencies:
```sh
npm install
```

Starts local dev server at `localhost:3000`:
```sh
npm run dev
```

Build your production site to `./dist/`:
```sh
npm run build
```

Preview your build locally, before deploying:
```sh
npm run preview
```

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

# Deployment using CLI

To deploy the application, first log into Vercel:

```sh
vercel login
```

Consider switching teams

```sh
vercel teams ls
```

Switch to the stateful team
```sh
vercel teams switch stateful
```

then run:

```vercel
vercel --prod
```

afterwards, you can optionally log out:

```sh
vercel logout
```

or call another command:

```vercel
vercel domain
```

# Deployment using app

```
https://vercel.com/stateful
```

Perhaps deploy the examples site?

```
https://vercel.com/stateful/sourishkrout-examples
```
