import { parseCode, getHTMLTemplate } from '../utils'

export default function (code: string, filename: string, attributes: Record<string, string>) {
  const { scriptSection, htmlSection } = parseCode(code)
  const html = getHTMLTemplate(htmlSection, scriptSection, attributes)
  return { html }
}
