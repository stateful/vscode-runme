/* eslint-disable max-len */
/**
 * A generated module for VscodeRunme functions
 *
 * This module has been generated via dagger init and serves as a reference to
 * basic module structure as you get started with Dagger.
 *
 * Two functions have been pre-created. You can modify, delete, or add to them,
 * as needed. They demonstrate usage of arguments and return types using simple
 * echo and grep commands. The functions can be called from the dagger CLI or
 * from one of the SDKs.
 *
 * The first line in this comment block is a short description line and the
 * rest is a long description with more detail on the module's purpose or usage,
 * if appropriate. All modules should have a short description.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { dag, Container, File, Directory, object, func, field } from '@dagger.io/dagger'

@object()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class VscodeRunme {
  @field()
  dir: Directory

  @field()
  container: Container

  @func()
  withRemote(remote: string, ref: string): VscodeRunme {
    this.dir = dag
    .git(`https://${remote}.git`)
    .ref(ref)
    .tree()

    return this
  }

  @func()
  /**
   * Sets up the container for the VscodeRunme instance.
   * @param binary - Optional binary file to be added to the container.
   * @param presetup - Optional presetup file to be added to the container.
   * @returns The modified VscodeRunme instance.
   */
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

  @func()
  async buildExtension(ghToken: string): Promise<string> {
    return this.container
      .withEnvVariable('GITHUB_TOKEN', ghToken)
      .withExec('runme run setup build'.split(' ')).
      stdout()
  }
}
