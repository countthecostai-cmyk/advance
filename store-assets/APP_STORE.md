# Advance — App Store submission notes

This file tracks everything needed to get Advance into the App Store, what's
already done, and what still needs a Mac (or a cloud Mac build service) plus
your Apple Developer account.

## Already done (no Mac needed)

- **Privacy Policy**: live at `/privacy` (e.g. https://advance-nu-seven.vercel.app/privacy)
- **Terms of Use**: live at `/terms`
- **App Store icon**: `appstore-icon-1024.png` (sent separately in chat, not
  committed to this repo since it's a binary file) — 1024×1024, flat square,
  no transparency (Apple rejects icons with alpha/rounded corners baked in —
  it adds the rounding itself). Save it somewhere you'll find it again before
  generating the Xcode project.
- **Native wrapper config**: `capacitor.config.ts` at the repo root. This
  points a native iOS shell at the live Advance site (`server.url`), so the
  App Store app always shows the real, current Advance — no separate
  "native" codebase to keep in sync. Ordinary feature updates just deploy to
  Vercel as usual; only icon/name/permission changes need a new App Store
  build.
- `@capacitor/cli`, `@capacitor/core`, `@capacitor/ios` added as dev
  dependencies.

## Still needed (requires a Mac or a cloud Mac build service, + your Apple Developer account)

1. **Register the App ID** in your Apple Developer account
   (developer.apple.com → Certificates, IDs & Profiles) — suggested bundle ID
   is `com.countthecostai.advance` (already set in `capacitor.config.ts`);
   change it there first if you want a different one.
2. **Generate the native iOS project**: `npx cap add ios` (needs CocoaPods,
   which needs a Mac). This creates an `ios/` folder with an Xcode project.
3. **Set the real app icon** inside the generated Xcode project from the
   `appstore-icon-1024.png` file (Xcode's asset catalog can generate every
   smaller size from the one 1024×1024 file).
4. **Build, sign, and archive** in Xcode, or through a cloud Mac CI service
   (for example Codemagic or GitHub Actions' macOS runners) using the App
   Store Connect API key described below instead of your Apple ID password.
5. **Create the app listing** in App Store Connect using the copy in
   `store-assets/listing.md`.
6. **Take screenshots** — once the app builds, screenshots can be captured
   from the iOS Simulator (no physical device needed) at the required sizes.
7. **Submit for review**, including the reviewer notes in `store-assets/listing.md`
   explaining the Shortcut-based sending model up front — this is the single
   biggest risk of rejection, since Apple scrutinizes anything that sends
   bulk text messages.

## Giving Claude safe access (no password needed)

Apple has a purpose-built, revocable way to let automated tools build and
submit on your behalf, without ever sharing your Apple ID password:

1. App Store Connect → **Users and Access** → **Integrations** tab
2. Tap **+** to generate a new **App Store Connect API Key**
3. Name it (e.g. "Advance CI"), role: **App Manager** or **Admin**
4. Download the `.p8` key file, and note the **Key ID** and **Issuer ID**
   shown on that page

That key can be revoked instantly from the same screen at any time, and it
can never be used to change your Apple ID password or sign in as you
anywhere else.
