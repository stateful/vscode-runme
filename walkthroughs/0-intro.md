# Why Runme?

Thank you for interest in Runme 💟!

Runme is a tool that makes runbooks actually runnable, making it easier to follow step-by-step instructions. Users can execute instructions, check intermediate results, and ensure the desired outputs are achieved. Authors can create predefined golden paths and share them with others. Runme combines the guardrails of a pipeline with the flexibility of scripting, where users can check intermediary results before moving on.

Runme achieves this by literally running markdown (ubiquitous for docs inside repos). More specifically, Runme runs your commands inside your fenced code blocks (shell, bash, zsh). It's 100% compatible with your programming language's task definitions (Makefile, Gradle, Grunt, NPM scripts, Pipfile or Deno tasks, etc.). Runme persists your runbooks in markdown, which your docs are likely already using.

<div align="center">
  <img src="https://docs.runme.dev/img/venn.png" />
  <a href="command:runme.try">Give Runme a try</a>
</div>

## What is Runme? 🤔​

Runme has interfaces for terminal, editor, and notebooks attached to a kernel, making them interoperable. While all client interfaces share core features, namely execution, they excel in different use cases.

> 💡 Runme is like Jupyter but with a Shell/Bash Kernel and lightweight dependencies.

Runme runs your runbooks everywhere, irrespective of the environment: a local laptop, a VM, a Devcontainer, Cloud Development Environment, or attached to a remote host via SSH:

- Split loose scripts into runbooks with separate cells, intermediate outputs, and controls to check before moving on.
- Get ahead of bit-rot and reverse-engineering runbooks executing them directly from markdown inside your project's repo.
- Increase shareability of runbooks by decoupling them from personal dotfiles or bash_history's without getting in the way.
- Codify golden paths without overly restricting the flexibility of "scripting".

Read more about Runme in the [official documentation](https://docs.runme.dev/).
