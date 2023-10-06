---
sidebar_position: 1
title: Examples
---

# Runme Examples

This `CATEGORIES.md` contains examples for running automated e2e tests for this extension.

# Extension Example Markdown Files

This markdown file contains some custom examples to test the execution within a VS Code Notebook.

## Exclude from run all with Category

```sh { background=false category=category-one excludeFromRunAll=false interactive=true }
echo "Hello I am excluded I won't show up with Run All!"
```

## Excluded from run all forced to false

```sh { excludeFromRunAll=false interactive=false }
echo "Block line one not excluded 👀"
echo "Block line two not excluded ether 🚀"
```

## Default no excluded from run all

```sh { background=true }
echo  "By default I am not excluded from run all"
```

# Categories

This markdown file contains some custom examples to test the categories execution within a VS Code Notebook.

## Without Category

```sh
echo "Hello, I don't have a category"
```

## Category one with multiple lines

```sh { category=category-one }
echo "Block line one with category one 👀"
echo "Block line two with category one as well 🚀"
```

## Category two

```sh { category=category-two }
echo "Category two single line"
```
