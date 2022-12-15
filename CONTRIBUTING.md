# Contributing to `vscode-runme`

**Thank you for your interest in `vscode-runme`. Your contributions are highly welcome.**

There are multiple ways of getting involved:

- [Report a bug](#report-a-bug)
- [Suggest a feature](#suggest-a-feature)
- [Contribute code](#contribute-code)

Below are a few guidelines we would like you to follow.
If you need help, please reach out to us by opening an issue.

## Report a bug
Reporting bugs is one of the best ways to contribute. Before creating a bug report, please check that an [issue](/issues) reporting the same problem does not already exist. If there is such an issue, you may add your information as a comment.

To report a new bug you should open an issue that summarizes the bug and set the label to "bug".

If you want to provide a fix along with your bug report: That is great! In this case please send us a pull request as described in section [Contribute Code](#contribute-code).

## Suggest a feature
To request a new feature you should open an [issue](../../issues/new) and summarize the desired functionality and its use case. Set the issue label to "feature".

## Contribute code
This is an outline of what the workflow for code contributions looks like

- Check the list of open [issues](../../issues). Either assign an existing issue to yourself, or
create a new one that you would like work on and discuss your ideas and use cases.

It is always best to discuss your plans beforehand, to ensure that your contribution is in line with our goals.

- Fork the repository on GitHub
- Create a topic branch from where you want to base your work. This is usually master.
- Open a new pull request, label it `work in progress` and outline what you will be contributing
- Make commits of logical units.
- Make sure you sign-off on your commits `git commit -s -m "adding X to change Y"`
- Write good commit messages (see below).
- Push your changes to a topic branch in your fork of the repository.
- As you push your changes, update the pull request with new infomation and tasks as you complete them
- Project maintainers might comment on your work as you progress
- When you are done, remove the `work in progess` label and ping the maintainers for a review
- Your pull request must receive a :thumbsup: from two [maintainers](MAINTAINERS)

### Prerequisites

To build and work on this project you need to install:

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [NPM](https://www.npmjs.com/package/npm) (latest)

### Check out code

To get the code base, have [git](https://git-scm.com/downloads) installed and run:

```sh
git clone git@github.com:stateful/vscode-runme.git
```

optionally install the GitHub CLI to streamline downloading the WASM binary:

```sh
# macOS
brew install gh
# other platforms: https://github.com/cli/cli#installation
```

then ensure to install all project dependencies:

```sh
cd vscode-runme
nvm install
GITHUB_REF_NAME=$(git branch --show-current) GITHUB_TOKEN=$(gh auth token) npm install --include=dev
```

This should also download the Runme CLI WASM file. If an error happened follow the error instructions and re-run the download, via:

```sh
GITHUB_REF_NAME=$(git branch --show-current) GITHUB_TOKEN=$(gh auth token) npm run download:wasm
```

### Build Project

To compile all extension files, run:

```sh
npm run build
```

### Test Project

To test the project, run:

```sh
npm run test
```

### Commit messages
Your commit messages ideally can answer two questions: what changed and why. The subject line should feature the “what” and the body of the commit should describe the “why”.

When creating a pull request, its description should reference the corresponding issue id.

## Release Project

Contributor with push access to this repo can at any time make a release. To do so, just trigger the [GitHub Action](https://github.com/stateful/vscode-runme/actions?query=workflow%3A%22Manual+NPM+Publish%22) that releases the package. Ensure you pick the correct release type by following the [semantic versioning](https://semver.org/) principle.

---

**Have fun, and happy hacking!**

Thanks for your contributions!


