import { workspace, window, Uri } from 'vscode'
import { dir } from 'tmp-promise'

import { BOOTFILE } from '../constants'

const config = workspace.getConfiguration('runme.checkout')
const INTERVAL = 500
const MINIMAL_TIMEOUT = 10 * 1000
const DEFAULT_START_FILE = 'README.md'

/**
 * Get the project directory from the settings object.
 *
 * If none is set up, the directory will be a temporary directory.
 *
 * If the set up directory doesn't exist, it will ask whether to create it and if not
 * we return `null` meaning we should cancel the checkout operation.
 *
 * @returns `vscode.Uri` with target directory to check out the project to
 *          `null` if the user doesn't want to create the directory, here we should cancel the operation
 */
export async function getProjectDir () {
    const projectDirPath: string | undefined = config.get('projectDir')

    if (!projectDirPath) {
        return Uri.parse((await dir()).path)
    }

    const projectDir = Uri.parse(projectDirPath)
    const isExisting = await workspace.fs.stat(projectDir)
        .then(() => true, () => false)
    if (isExisting) {
        return projectDir
    }

    const createDir = (await window.showInformationMessage(
        `A project directory (${projectDir}) was set up but doesn't exist. ` +
        'Do you want to create it?',
        'Yes', 'No'
    )) === 'Yes'

    if (!createDir) {
        return null
    }

    await workspace.fs.createDirectory(projectDir)
    return projectDir
}

/**
 * Create the name of the target directory to checkout a project to
 * @param targetDir Uri of the base directory (received by calling `getProjectDir`)
 * @param suggestedName name of the directory to check the project into, e.g. "org/projectName"
 * @param index index which increases if directory name exists (e.g. "foobar_1")
 * @returns a string with the name of the target directory
 */
export async function getTargetDirName (targetDir: Uri, suggestedName: string, index = 0): Promise<string> {
    /**
     * for now let's expect a suggested name mimicking the format "<org>/<project>"
     */
    if (suggestedName.split('/').length !== 2) {
        throw new Error(`Invalid project directory suggestion: ${suggestedName}`)
    }

    /**
     * create org directory
     */
    const [orgName] = suggestedName.split('/')
    const orgDir = Uri.joinPath(targetDir, orgName)
    const isOrgDirExisting = await workspace.fs.stat(orgDir).then(() => true, () => false)
    if (!isOrgDirExisting) {
        await workspace.fs.createDirectory(orgDir)
    }

    const amendedSuggestedName = !index ? suggestedName: `${suggestedName}_${index}`
    const fullTargetDir = Uri.joinPath(targetDir, amendedSuggestedName)
    const isExisting = await workspace.fs.stat(fullTargetDir).then(() => true, () => false)
    if (isExisting) {
        return getTargetDirName(targetDir, suggestedName, ++index)
    }

    return amendedSuggestedName
}

export async function waitForProjectCheckout (
    targetDir: string,
    repository: string,
    cb: (success: boolean) => void
) {
    const targetDirUri = Uri.parse(targetDir)
    const t = setTimeout(() => {
        clearInterval(i)
        window.showErrorMessage(`Timed out cloning repository ${repository}`)
        return cb(false)
    }, Math.max(config.get('timeout') || 0, MINIMAL_TIMEOUT))
    const i = setInterval(async () => {
        const dirEntries = await workspace.fs.readDirectory(targetDirUri)
        /**
         * wait until directory has more files than only a ".git"
         */
        if (dirEntries.length <= 1) {
            return
        }

        /**
         * write a runme file into the directory, so the extension knows it has
         * to open the readme file
         */
        const fileExist = await workspace.fs.stat(Uri.joinPath(targetDirUri, DEFAULT_START_FILE))
            .then(() => true, () => false)
        if (fileExist) {
            const enc = new TextEncoder()
            await workspace.fs.writeFile(Uri.joinPath(targetDirUri, BOOTFILE), enc.encode(DEFAULT_START_FILE))
        }

        clearTimeout(t)
        clearInterval(i)
        cb(true)
    }, INTERVAL)
}

/**
 * get suggested name from provided repository url
 */
export function getSuggestedProjectName (repository: string) {
    /**
     * verify repository url has the right format,
     * e.g. currently we only support "git@provider.com:org/project.git"
     */
    if (!repository.startsWith('git@') || !repository.endsWith('.git') || repository.split(':').length !== 2) {
        window.showErrorMessage(
            'Invalid git url, expected following format "git@provider.com:org/project.git",' +
            ` received "${repository}"`
        )
        return
    }

    return repository.slice(0, -4).split(':')[1]
}
