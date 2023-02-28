
const ARCHITECTURES = {
    x86: 'x86_64',
    arm64: 'arm64',
}

const SUPPORTED_PLATFORMS = {
    macOS: {
        platform: 'darwin',
        format: 'tar.gz',
        architectures: [ARCHITECTURES.x86, ARCHITECTURES.arm64]
    },
    linux: {
        platform: 'linux',
        format: 'tar.gz',
        architectures: [ARCHITECTURES.x86, ARCHITECTURES.arm64]
    },
    windows: {
        platform: 'windows',
        format: 'zip',
        architectures: [ARCHITECTURES.x86, ARCHITECTURES.arm64]
    }
}

export default async ({ github, context, core }) => {
    console.log('Check release started...')
    const repo = process.env.REPOSITORY
    const releaseVersion = context.payload?.inputs?.releaseVersion
    if (!repo) {
        throw new Error('couldn\'t find a REPOSITORY environment variable')
    }
    if (!releaseVersion) {
        throw new Error('couldn\'t find a release version specified')
    }

    console.log(`Checking release ${releaseVersion} for ${repo}`)
    const params = {
        owner: context.repo.owner,
        repo,
    }
    let release
    if (releaseVersion === 'latest') {
        const { data } = await github.rest.repos.getLatestRelease(params)
        release = data
    } else {
        const { data } = await github.rest.repos.getReleaseByTag({
            ...params,
            tag: releaseVersion
        })
        release = data
    }
    if (!release) {
        throw new Error(`Release not found ${releaseVersion}`)
    }

    if (release.draft || release.prerelease) {
        throw new Error(`The release ${releaseVersion} is not a stable release version!`)
    }

    if (!release.assets?.length) {
        throw new Error('Could\'t find valid release assets')
    }

    // Get release assets for each platform
    for (const [key, { platform, format, architectures }] of Object.entries(SUPPORTED_PLATFORMS)) {
        architectures.forEach((architecture) => {
            const assetName = `${repo}_${platform}_${architecture}.${format}`
            const asset = release.assets.find(({ name }) => name === assetName)
            if (!asset) {
                console.log(`Asset not found:${assetName}, skipping`)
            }
            if (asset) {
                const assetKey = `${key.toLocaleUpperCase()}_${architecture}`
                // (e.g) DOWNLOAD_URL_LINUX_x86_64, DOWNLOAD_URL_WINDOWS_arm64
                const downloadVariable = `DOWNLOAD_URL_${assetKey}`
                core.exportVariable(downloadVariable, asset.browser_download_url)
                console.log(`Exported the following variable: ${downloadVariable}`)
            }
        })
    }
}