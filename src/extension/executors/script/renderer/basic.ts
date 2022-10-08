import { parseCode, getHTMLTemplate } from '../utils'

export default function (code: string) {
  const { scriptSection, htmlSection } = parseCode(code)
  const html = getHTMLTemplate(htmlSection, scriptSection)
  return { html }
}
