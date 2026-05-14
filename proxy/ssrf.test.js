import { describe, it, expect } from 'vitest'
import { isPrivateIP, ip4ToInt } from '../proxy/ssrf.js'

describe('ip4ToInt', () => {
  it('127.0.0.1', () => {
    expect(ip4ToInt('127.0.0.1')).toBe(2130706433)
  })

  it('10.0.0.0', () => {
    expect(ip4ToInt('10.0.0.0')).toBe(167772160)
  })

  it('192.168.1.1', () => {
    expect(ip4ToInt('192.168.1.1')).toBe(3232235777)
  })

  it('0.0.0.0', () => {
    expect(ip4ToInt('0.0.0.0')).toBe(0)
  })
})

describe('isPrivateIP', () => {
  it('blocks 127.0.0.1', () => {
    expect(isPrivateIP('127.0.0.1')).toBe(true)
  })

  it('blocks 127.0.0.0/8 range', () => {
    expect(isPrivateIP('127.255.255.255')).toBe(true)
  })

  it('blocks 10.0.0.0/8 range', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true)
    expect(isPrivateIP('10.255.255.255')).toBe(true)
  })

  it('blocks 172.16.0.0/12 range', () => {
    expect(isPrivateIP('172.16.0.1')).toBe(true)
    expect(isPrivateIP('172.31.255.255')).toBe(true)
  })

  it('allows 172.32.0.0 outside 172.16/12', () => {
    expect(isPrivateIP('172.32.0.1')).toBe(false)
  })

  it('blocks 192.168.0.0/16 range', () => {
    expect(isPrivateIP('192.168.1.1')).toBe(true)
    expect(isPrivateIP('192.168.255.255')).toBe(true)
  })

  it('blocks 169.254.0.0/16 (link-local)', () => {
    expect(isPrivateIP('169.254.169.254')).toBe(true)
  })

  it('blocks 0.0.0.0', () => {
    expect(isPrivateIP('0.0.0.0')).toBe(true)
  })

  it('blocks localhost', () => {
    expect(isPrivateIP('localhost')).toBe(true)
    expect(isPrivateIP('LOCALHOST')).toBe(true)
  })

  it('blocks IPv6 loopback ::1', () => {
    expect(isPrivateIP('[::1]')).toBe(true)
  })

  it('blocks IPv6 unspecified ::', () => {
    expect(isPrivateIP('[::]')).toBe(true)
  })

  it('blocks IPv6 ULA fc00::/7', () => {
    expect(isPrivateIP('[fc00::1]')).toBe(true)
    expect(isPrivateIP('[fdff::1]')).toBe(true)
  })

  it('blocks all IPv6 addresses', () => {
    expect(isPrivateIP('::1')).toBe(true)
    expect(isPrivateIP('2001:db8::1')).toBe(true)
  })

  it('allows public IPv4 addresses', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false)
    expect(isPrivateIP('1.1.1.1')).toBe(false)
    expect(isPrivateIP('93.184.216.34')).toBe(false)
  })

  it('allows public hostnames', () => {
    expect(isPrivateIP('example.com')).toBe(false)
    expect(isPrivateIP('api.github.com')).toBe(false)
  })

  it('blocks metadata.google.internal', () => {
    expect(isPrivateIP('metadata.google.internal')).toBe(true)
  })
})
