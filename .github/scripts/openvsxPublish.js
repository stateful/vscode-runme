import { publish } from 'ovsx'

export default async (targetPlatform) => {
    const {
        EXTENSION_NAME,
        RELEASE_VERSION,
        pat
    } = process.env

    const extensionFile = `./${EXTENSION_NAME}-${targetPlatform}-${RELEASE_VERSION}.vsix`
    if (!pat) {
        console.log('Could not load OpenVSX Token')
        return
    }
    console.log(`Publishing to OpenVSX: ${extensionFile}`)
    await publish({
        targets: [targetPlatform],
        extensionFile,
        preRelease: false,
        pat
    })
}