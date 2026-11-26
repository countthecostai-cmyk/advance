import type { CapacitorConfig } from '@capacitor/cli'

// Wraps the already-deployed Advance web app in a native iOS shell so it
// can be submitted to the App Store. This does NOT duplicate the app --
// `server.url` points the native WKWebView at the real, live Advance site,
// so every update pushed to Vercel shows up in the App Store app too, with
// no separate release needed for ordinary feature/bugfix changes (only
// icon/name/permission changes require a new App Store build).
//
// appId must match the App ID registered in the Apple Developer account
// (it is also set as PRODUCT_BUNDLE_IDENTIFIER in the Xcode project).
const config: CapacitorConfig = {
  appId: 'com.countthecostai.advance',
  appName: 'Advance',
  webDir: 'public',
  server: {
    url: 'https://advance-nu-seven.vercel.app',
    cleartext: false,
    // Bundled page shown when the site can't be reached (no signal, Vercel
    // down) instead of a blank screen. It lives in `public/`, which is
    // copied into the app by `npx cap sync`. Keep its retry URL in step with
    // `url` above if the domain ever changes.
    errorPath: 'native-offline.html',
  },
  ios: {
    contentInset: 'always',
  },
}

export default config
