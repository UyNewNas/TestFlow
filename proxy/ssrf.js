import { isIP } from 'node:net'

const BLOCKED_IPV4_RANGES = [
  { start: ip4ToInt('10.0.0.0'), end: ip4ToInt('10.255.255.255') },
  { start: ip4ToInt('172.16.0.0'), end: ip4ToInt('172.31.255.255') },
  { start: ip4ToInt('192.168.0.0'), end: ip4ToInt('192.168.255.255') },
  { start: ip4ToInt('127.0.0.0'), end: ip4ToInt('127.255.255.255') },
  { start: ip4ToInt('169.254.0.0'), end: ip4ToInt('169.254.255.255') },
  { start: ip4ToInt('0.0.0.0'), end: ip4ToInt('0.0.0.0') },
]

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal'])

export function ip4ToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
}

export function isPrivateIP(hostname) {
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) return true
  if (hostname === '[::1]' || hostname === '[::]') return true
  if (hostname.startsWith('[fc') || hostname.startsWith('[fd')) return true

  const ipType = isIP(hostname)
  if (ipType === 6) return true
  if (ipType === 4) {
    const int = ip4ToInt(hostname)
    return BLOCKED_IPV4_RANGES.some(r => int >= r.start && int <= r.end)
  }
  return false
}
