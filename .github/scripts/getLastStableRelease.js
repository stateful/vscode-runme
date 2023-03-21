import os from 'node:os'


const getLastStableRelease = async () => {
    /**
     * The latest release is the most recent non-prerelease, non-draft release
     */
    const response = await fetch('https://api.github.com/repos/stateful/runme/releases/latest', {
        headers: {
            'Accept': 'application/vnd.github+json'
        }
    })
    const { tag_name } = await response.json()
    const arch = os.arch()
    const ext = os.platform() === 'win32' ? 'zip' : 'tar.gz'
    const binary = `${os.platform().replace('win32', 'windows')}_${arch === 'x64' ? 'x86_64' : arch}.${ext}`
    const downloadUrl = `https://download.stateful.com/runme/${tag_name.replace('v', '')}/runme_${binary}`
    // This console log is important since it's being exported to a ENV VAR
    console.log(downloadUrl)
}


await getLastStableRelease()


