import { redirect } from 'next/navigation'

// There's no password or texted code to sign back in with (see /signup) —
// a "login" screen with nothing to type into it would just confuse people.
// Anyone who lands here (an old bookmark, a stale link) is sent to the one
// real entry point instead.
export default function LoginPage() {
  redirect('/signup')
}
