export function resolveOsUserName(imageName: string | null | undefined) {
  if (!imageName) {
    return ''
  }

  const defaultUserName = 'ec2-user'
  const amiPatterns: { [key: string]: string } = {
    '^(amazon|amzn|al2023|rhel|suse-sles)': defaultUserName,
    '^(ubuntu|centos|redhat|debian)': '\\1', // Use backreference for matched pattern (group 1)
  }

  for (const pattern in amiPatterns) {
    const match = imageName.toLocaleLowerCase().match(new RegExp(pattern, 'i'))
    if (match && match[1]) {
      return amiPatterns[pattern].replace('\\1', match[1])
    }
  }

  return defaultUserName
}
