# Deploy Next.js with Runme

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, install all dependencies:

```sh
npm install
```

then, run the development server:

```sh { background=true }
npx next dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

```sh
open http://localhost:3000
```

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

To deploy this application, first log into Vercel:

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

Set up your project name

```sh
export PROJECT_NAME=Name of your project
echo "Your project name is set to: $PROJECT_NAME"
```

Link your local directory to a project

```sh
vercel link -p $PROJECT_NAME
```

then kick off a preview deploy and optionally promote to prod

```sh { interactive=false }
vercel
```

afterwards, you can optionally log out:

```sh
vercel logout
```

or call another command:

```sh { interactive=false }
vercel domain
```
