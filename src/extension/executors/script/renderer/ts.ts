import { getHTMLTemplate } from '../utils'

export default function (ts: string, filename: string, attributes: Record<string, string>) {
  const htmlSection = /*html*/`
    <script type="module" src="/_notebook/${filename}.ts"></script>
  `
  const html = getHTMLTemplate({ htmlSection, attributes, filename })
  return { html, ts }
}
