# Why Runme?

Thank you for interest in Runme 💟!

Runme strives to provide a great experience right out of the box. Please continue to learn how to get the most out of our docs via Runme. Please don't be surprised if Runme's docs prompt you to use Runme. Learning by using is very effective.

<div>
  <img width="15" src="https://runme.dev/img/logo.svg" />
  <a href="command:runme.try">Give Runme a try</a>
</div>

A well-written README can significantly impact time to get up and running on your projects, reduce onboarding time, and interactively document common development and operations workflows (runbooks). On the contrary, a poorly written README can negatively impact the visibility of your project, even if the underyling code of your software is in excellent condition. For new contributors, it can quickly become a very frustrating experience.

The Runme team believes that even if you have textually excellent README.md, encouraging your users to experience it through the lens of Runme, your docs will be more reliable, less susceptible to bit-rot, and a lot more humanly ergnomic. All of which leeds to happier and more productive developers.

## What is Runme? 🤔​

Runme is primary interface is a VS Code extension that provides developers with the ability to navigate workflows center around code repositories by making Readme markdown files interactive and smart. It consists of two major parts:

- A [CLI tool](https://github.com/stateful/runme) that understands markdown and allows you to discover and run code snippets within it

- A VS Code extension that integrates these capabilities into VS Code and allows you to run markdown through a notebook UI

## 🤩 Markdown turned interactive

- 🏃 Runme lets you craft dev-native markdown files and create an interactive runbook experience for VS Code.
- 🙌 It is an open-source tool building on the developer norm of using README.md as an entry point to a code repository.
- 📜 It lets you seamlessly turn your existing Markdown docs, such as README.md, into runnable notebooks.
⏯ It enables static docs to become interactive for its readers and greatly improves their learning experience.
- 🙆 Runme is a human-centric approach to providing and consuming code repository documentation. It's designed to progressively bridge the widening developer experience gaps in a cloud-native age.

Gaps in developer experience such as:

- Low integration between building blocks employed to deliver apps and services
- Error-prone copy&paste-management of dev environments
- Docs that have fallen behind undetected
- The vault lines of commonplace tools were designed for machines, not humans.

![Readme as Notebook and Markdown side-by-side](https://www.runme.dev/assets/images/README_side_by_side-e67bbc4db8e183d9193f1fcccd9b302b.png)

Runme’s purpose is to enable developers to achieve a functional local development environment quickly, starting with copy&paste, click to run commands, and many more features. While README.md is the most well-known, there are several other markdown files often found in a repo that you may encounter, including; BUILD.md, CONTRIBUTING.md, and many more. Runme supports most .md and .mdx files!

Make sure to [get in touch](https://discord.gg/BQm8zRCBUY) with us if you are missing a feature or have other ideas. You can review development progress in [Runme's roadmap](https://github.com/stateful/runme/projects).

👩‍💻 As a VS Code user, just click here to leverage Runme to run through this getting started guide.

## 🛣 What's on the roadmap

Review development progress in [Runme's roadmap](https://github.com/stateful/runme/projects)
A few highlights of what's coming:

- Just like code, test your documentation in Continiuous Integration
- Switch back and forth between notebook and terminal UX seamlessly
- Notebook UX tweaks and integrations for both authors and users
- And more - tell us about your feature request [on Discord](https://discord.gg/stateful)

## Known limitations

- Be cautious with environment variables interleaved within code blocks. The stateful execution of the notebooks (shell/bash-only; no PowerShell on Windows yet) leverages a naive implementation where the VS Code extension prompts for ENV var values and attempts to expand them. In essence, it does not match an interactive bash/shell session (yet).

- We continue experimenting with aspects of user/developer experience including the passing of information/variables from cell to cell, ENV var handling that more closely matches shell a session and more robust markdown handling.

- Please [report any issues](https://github.com/stateful/runme/issues/new) you encounter to help us mature Runme.

## 💡 Telemetry for improvements

Runme exists to serve its users. Any information emitted by Runme is pseudo-anonymized (no PII whatsoever) and the emitter will respect VS Code's global "send no telemetry" (id: telemetry.telemetryLevel) setting. The purpose of collecting this information is to continuously improve the Runme experience for developers.

Telemetry collected includes:

- Buttons clicked & commands triggered
- Total cells and how many are being executed
- Extension activation and deactivation
- Notebook opened and saved (incl. metadata; file names are obfuscated)

Please find us on [Discord](https://discord.gg/stateful) if you have any questions.

<br /><br />
