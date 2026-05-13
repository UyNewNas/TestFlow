export {}

declare global {
  interface Window {
    testflow?: {
      platform: string
      isElectron: boolean
    }
  }
}
