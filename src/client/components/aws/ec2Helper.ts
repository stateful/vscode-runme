export function resolveOsUserName(imageName: string) {
  if (!imageName) {
    return ''
  }

  const amiPatterns: { [key: string]: string } = {
    '^(amazon|amzn|al2023)': 'ec2-user',
    '^(ubuntu|centos|redhat|debian)': '\\1', // Use backreference for matched pattern (group 1)
    '.+': '\\w+',
  }

  for (const pattern in amiPatterns) {
    const match = imageName.match(new RegExp(pattern))
    if (match) {
      return match[1] ? amiPatterns[pattern].replace('\\1', match[1]) : amiPatterns[pattern]
    }
  }

  return ''
}
