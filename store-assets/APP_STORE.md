# Advance — App Store submission notes

This file tracks everything needed to get Advance into the App Store, what's
already done, and what still needs a Mac (or a cloud Mac build service) plus
your Apple Developer account.

## Already in this repo

- **iOS project**: `ios/` (Capacitor 8, Swift Package Manager, no
  CocoaPods). Bundle ID `com.countthecostai.advance`, team `FD3ZZ9BJ6A`,
  iPhone only, portrait, iOS 15+. It loads the live site
  (`server.url` in `capacitor.config.ts`), so normal updates ship through
  Vercel with no new App Store build.
- **Icon and launch screen**: `npm run ios:assets` writes them into the
  Xcode asset catalog (they aren't committed). Put a designed icon at
  `store-assets/appstore-icon-1024.png` (1024×1024, no transparency) to use
  it instead of the generated teal "A"; add `--force` to replace files
  already there.
- **Offline screen**: `public/native-offline.html`, shown by the app
  instead of a blank screen when the site can't be reached.
- **App-only behaviour**: native Contacts import; Safari and "Add to Home
  Screen" steps hidden inside the app; the Shortcut download opens in
  Safari so it imports into Shortcuts instead of breaking the app screen.
- **Review basics**: Privacy Policy `/privacy`, Terms `/terms` (with a
  no-objectionable-content section), Support `/support`, in-app account
  deletion (Settings), leave group and report a concern on every group page.
- **Listing copy and reviewer notes**: `store-assets/listing.md`.

## Building and submitting (on the Mac)

1. Merge the App Store fixes and let Vercel deploy them, because the app
   shows the live site.
2. `git pull`, then `npm install` and `npm run ios:sync` (writes the icon
   and launch screen, copies the offline page, links the Contacts plugin).
3. `npm run ios:open`, pick a real iPhone or a simulator and press Run to
   check: first open lands on Home, Contacts permission prompt, a Test Mode
   send, airplane mode shows the offline screen.
4. Raise the build number (target → General → Build) above the last one
   uploaded, then Product → Archive → Distribute App → App Store Connect.
5. In App Store Connect: pick the new build, paste the reviewer notes from
   `store-assets/listing.md`, add screenshots, answer App Privacy (Contact
   Info: name and phone number, used for app functionality, not tracking),
   and reply to the earlier rejection in Resolution Center saying what
   changed. Then submit.

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
