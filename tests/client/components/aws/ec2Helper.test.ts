import { describe, it, expect } from 'vitest'

import { resolveOsUserName } from '../../../../src/client/components/aws/ec2Helper'

describe('resolveOsUserName', () => {
  it('should return empty string when imageName is empty', () => {
    expect(resolveOsUserName('')).toBe('')
  })

  it('should return "ec2-user" for Amazon Linux image names', () => {
    expect(resolveOsUserName('amazon-linux')).toBe('ec2-user')
    expect(resolveOsUserName('amzn-ami')).toBe('ec2-user')
    expect(resolveOsUserName('al2023')).toBe('ec2-user')
  })

  it('should return "ec2-user" for RHEL or SUSE Linux image names', () => {
    expect(resolveOsUserName('rhel-8')).toBe('ec2-user')
    expect(resolveOsUserName('suse-sles')).toBe('ec2-user')
  })

  it('should return the corresponding user for Ubuntu, CentOS, RedHat, or Debian image names', () => {
    expect(resolveOsUserName('ubuntu-20.04')).toBe('ubuntu')
    expect(resolveOsUserName('centos-7')).toBe('centos')
    expect(resolveOsUserName('redhat')).toBe('redhat')
    expect(resolveOsUserName('debian')).toBe('debian')
  })

  it('should return "ec2-user" for unknown patterns', () => {
    expect(resolveOsUserName('unknown-image')).toBe('ec2-user')
    expect(resolveOsUserName('custom-linux-image')).toBe('ec2-user')
  })

  it('should be case insensitive', () => {
    expect(resolveOsUserName('UbUnTu-18.04')).toBe('ubuntu')
    expect(resolveOsUserName('AMAZON-LINUX')).toBe('ec2-user')
    expect(resolveOsUserName('RHEL-7')).toBe('ec2-user')
  })

  it('should handle edge cases gracefully', () => {
    expect(resolveOsUserName(null)).toBe('')
    expect(resolveOsUserName(undefined)).toBe('')
    expect(resolveOsUserName('   ')).toBe('ec2-user') // Assuming whitespace counts as unknown pattern
  })
})
