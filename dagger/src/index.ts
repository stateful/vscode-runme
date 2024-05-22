/* eslint-disable max-len */
/**
 * Build the Runme VS Code extension end-to-end.
 *
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { dag, Container, File, Directory, object, func, field } from '@dagger.io/dagger'

@object()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class VscodeRunme {
  /**
   * The working repository directory for the VscodeRunme instance.
   */
  @field()
  dir: Directory

  /**
   * The base container being used for building the extension
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
    this.dir = dag
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
  withContainer(binary?: File, presetup?: File): VscodeRunme {
    this.container = dag
      .container()
      .from('node:18')
      .withEnvVariable('EXTENSION_NAME', 'runme')
      .withFile('/usr/local/bin/runme', binary)
      .withFile('/usr/local/bin/presetup', presetup)
      .withEntrypoint([])
      .withMountedDirectory('/mnt/vscode-runme', this.dir)
      .withWorkdir('/mnt/vscode-runme')
      .withExec('bash /usr/local/bin/presetup'.split(' '))

      return this
  }

  /**
   * Sets up the container for the VscodeRunme instance.
   * @param ghToken - Valid GitHub access token for API access.
   * @returns The modified VscodeRunme instance.
   */
  @func()
  async buildExtension(ghToken: string): Promise<string> {
    return this.container
      .withEnvVariable('GITHUB_TOKEN', ghToken)
      .withExec('runme run setup build'.split(' ')).
      stdout()
  }
}
