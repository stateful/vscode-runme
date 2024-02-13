---
runme:
  id: 01HF7B0KK745EFJMMTRV4WKYVK
  version: v3
sidebar_position: 1
title: Examples
---

# Runme Examples

This `CATEGORIES.md` contains examples for running automated e2e tests for this extension.

# Extension Example Markdown Files

This markdown file contains some custom examples to test the execution within a VS Code Notebook.

## Exclude from run all with Category

```sh {"background":"false","category":"category-one","excludeFromRunAll":"false","id":"01HF7B0KK745EFJMMTREDE931Y","interactive":"true"}
echo "Hello I am excluded I won't show up with Run All!"
```

## Excluded from run all forced to false

```sh {"excludeFromRunAll":"false","id":"01HF7B0KK745EFJMMTRFHK2NYT","interactive":"false"}
echo "Block line one not excluded 👀"
echo "Block line two not excluded ether 🚀"
```

## Default no excluded from run all

```sh {"background":"true","id":"01HF7B0KK745EFJMMTRHAND3H3"}
echo  "By default I am not excluded from run all"
```

# Categories

This markdown file contains some custom examples to test the categories execution within a VS Code Notebook.

## Without Category

```sh {"id":"01HF7B0KK745EFJMMTRMNVQQ8H"}
echo "Hello, I don't have a category"
```

## Category one with multiple lines

```sh {"category":"category-one","id":"01HF7B0KK745EFJMMTRQZ8MN1T"}
echo "Block line one with category one 👀"
echo "Block line two with category one as well 🚀"
```

## Category two

```sh {"category":"category-two","id":"01HF7B0KK745EFJMMTRRKA8NG3"}
echo "Category two single line"
```
