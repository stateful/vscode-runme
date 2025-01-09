/* eslint-disable max-len */
/**
 * Build the Runme VS Code extension end-to-end.
 *
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { dag, Container, File, Directory, object, func, field, Secret } from '@dagger.io/dagger'

@object()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class VscodeRunme {
  /**
   * The working repository directory for the VscodeRunme instance.
   */
  @field()
  directory: Directory

  /**
   * The base container being used for building the extension.
   */
  @field()
  container: Container

  /**
   * Build from remote git repository.
   * @param remote - Valid git remote url, aka repo to clone
   * @param ref - Branch, tag, or commit to checkout
   * @returns The modified VscodeRunme instance.
   */
  @func()
  withRemote(remote: string, ref: string): VscodeRunme {
    this.directory = dag
      .git(`https://${remote}.git`)
      .ref(ref)
      .tree()

    return this
  }

  /**
   * Sets up the container for the VscodeRunme instance.
   * @param binary - Optional kernel binary file to be added to the container.
   * @param presetup - Optional presetup (for dependencies) file to be added to the container.
   * @returns The modified VscodeRunme instance.
   */
  @func()
  withContainer(binary: File, presetup: File): VscodeRunme {
    this.container = dag
      .container()
      .from('node:18')
      .withEnvVariable('EXTENSION_NAME', 'runme')
      .withFile('/usr/local/bin/runme', binary)
      .withFile('/usr/local/bin/presetup', presetup)
      .withEntrypoint([])
      .withMountedDirectory('/mnt/vscode-runme', this.directory)
      .withWorkdir('/mnt/vscode-runme')
      .withExec('bash /usr/local/bin/presetup'.split(' '))

    return this
  }

  /**
   * Sets up the container for the VscodeRunme instance.
   * @param path - Path to file inside the container.
   * @returns The file or error
   */
  @func()
  async getFile(path: string): Promise<File> {
    return this.container.file(path)
  }

  /**
   * Sets up the container for the VscodeRunme instance.
   * @param path - Path to file inside the container.
   * @returns The file or error
   */
  @func()
  async getRepoFile(repo: string, path: string): Promise<File> {
    return dag
      .git(repo)
      .head()
      .tree()
      .file(path)
  }

  /**
   * Sets up the container for the VscodeRunme instance.
   * @param name - Name of the secret.
   * @param plain - Plaintext.
   * @returns The Secret or error
   */
  @func()
  async withSecret(name: string, value: Secret): Promise<Secret> {
    const plain = await value.plaintext()
    return dag.setSecret(name, plain)
  }

  /**
   * Sets up the container for the VscodeRunme instance.
   * @param githubTokenSecret - Valid GitHub access token for API access passed as secret.
   * @returns The packaged VSIX extension file.
   */
  @func()
  async buildExtension(githubTokenSecret: Secret): Promise<File> {
    return this.container
      .withSecretVariable('GITHUB_TOKEN', githubTokenSecret)
      .withExec('runme run setup build bundle'.split(' '))
      .file('runme-extension.vsix')
  }
}
