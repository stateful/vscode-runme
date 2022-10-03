import vscode, {
  TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution,
  ExtensionContext
} from "vscode"
import got from 'got'
import { OutputType } from '../../../constants'
import { CellOutput } from '../../../types'
import { getAuthToken } from './utils'

interface VercelProject {
  id: string
  name: string
}

export async function vercelApp(
  context: ExtensionContext,
  exec: NotebookCellExecution,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  doc: TextDocument
): Promise<boolean> {
  const token = await getAuthToken()
    // eslint-disable-next-line @typescript-eslint/naming-convention
  const headers = { Authorization: `Bearer ${token}` }

  // const cwd = path.dirname(doc.uri.path)
  // const projectStr = (await fs.readFile(path.join(cwd, '.vercel', 'project.json'))).toString()
  // const { projectId, orgId } = JSON.parse(projectStr)

  const [, , , teamId, projectId] = doc.getText().split('/')

  const vercelMessaging = vscode.notebooks.createRendererMessaging("runme-vercel-app-renderer")
  vercelMessaging.onDidReceiveMessage(async e => {
    const { project, command } = e.message as any
    if (project && command && command === 'redeploy') {
      try {
        const res = (await got.post(
            `https://api.vercel.com/v13/deployments?teamId=${teamId}`,
            { headers, json: {
              name: Math.round(Math.random()*100000).toString(),
              project: project.id,
            } }
          ).json())
        console.log(res)
      } catch (err) {
        console.error(err)
      }
    }
  })
  let { projects } : { projects: VercelProject[] } = (await got(
    `https://api.vercel.com/v9/projects?teamId=${teamId}`,
    { headers }
  ).json())

  if (projectId) {
    projects = [projects.find(p => p.name === projectId)!]
  }

  exec.replaceOutput(new NotebookCellOutput([
    NotebookCellOutputItem.json(<CellOutput>{
      type: OutputType.vercelApp,
      output: projects
    }, OutputType.vercelApp)
  ], { vercelApp: { deploy: false } }))
  return true
}
