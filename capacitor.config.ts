import type { CapacitorConfig } from '@capacitor/cli'

// Wraps the already-deployed Advance web app in a native iOS shell so it
// can be submitted to the App Store. This does NOT duplicate the app --
// `server.url` points the native WKWebView at the real, live Advance site,
// so every update pushed to Vercel shows up in the App Store app too, with
// no separate release needed for ordinary feature/bugfix changes (only
// icon/name/permission changes require a new App Store build).
//
// appId is a placeholder -- replace with your own reverse-DNS identifier
// registered in your Apple Developer account before running `npx cap add ios`.
const config: CapacitorConfig = {
  appId: 'com.countthecostai.advance',
  appName: 'Advance',
  webDir: 'public',
  server: {
    url: 'https://advance-nu-seven.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
}

export default config
