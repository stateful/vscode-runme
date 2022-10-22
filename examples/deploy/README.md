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

# Deployment

To deploy the application, first log into Vercel:

```sh
vercel login
```

select your team, let's list them first:

```sh { interactive=false }
vercel teams ls 2>/dev/null
```

then select team (skip if no change required):

```sh
vercel team switch
```

go on to list projects:

```sh { interactive=false }
vercel projects list 2>&1 | tail -n +5
```

Great! Let's attempt a preview deploy.

Vercel will ask you to add a project if a project is not set up yet:

```sh { interactive=false }
echo "Deployment pending: "
vercel 2> /dev/null
```

if you're happy with preview, go ahead and promote to production:
```sh { interactive=false }
echo "Promoting to production: "
vercel --prod 1> /dev/null
```

afterwards, you can optionally log out:

```sh
vercel logout
```

or call another command:

```sh
vercel domain
```
