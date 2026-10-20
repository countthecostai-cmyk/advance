// App Store screenshot designs for Advance (served by /api/appstore-shots/[n]
// as 1320x2868 PNGs — Apple's 6.9" iPhone size). Built with plain
// createElement so it renders through next/og's ImageResponse (Satori).
// The UI here mirrors the real screens (colors, layout, labels) with sample
// data, for the App Store product page.
import { createElement } from 'react'
const h: any = createElement

export const W = 1320
export const H = 2868
const S = 2.5 // app UI scale (CSS px -> image px)

const C = {
  page: '#08090a',
  bg: '#0b0c0f',
  card: '#15161a',
  border: '#2a2c31',
  text: '#f3f3f4',
  muted: '#8b8e95',
  dim: '#5d6067',
  red: '#ef4b52',
  redText: '#f2666b',
  redBg: '#2a0d10',
}

const px = (n: number) => n * S

function box(style: any, ...children: any[]): any {
  return h('div', { style: { display: 'flex', ...style } }, ...children)
}
function text(str: string, style?: any): any {
  return h('div', { style: { display: 'flex', ...style } }, str)
}
function mono(str: string, style?: any): any {
  return text(str, {
    fontFamily: 'Mono',
    fontWeight: 600,
    letterSpacing: px(1.3),
    textTransform: 'uppercase',
    fontSize: px(10.5),
    color: C.muted,
    ...style,
  })
}
// Card with the app's signature bottom-left corner cut.
function card(style: any, ...children: any[]): any {
  const bg = style.background || C.card
  return box(
    {
      position: 'relative',
      background: bg,
      border: `${px(1)}px solid ${style.borderColor || C.border}`,
      flexDirection: 'column',
      ...style,
    },
    ...children,
    box({
      position: 'absolute',
      left: -px(1),
      bottom: -px(1),
      width: px(14),
      height: px(14),
      backgroundImage: `linear-gradient(45deg, ${C.bg} 50%, transparent 50%)`,
    })
  )
}

const ICONS: Record<string, string[]> = {
  home: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  contacts: ['M2 21v-1a6 6 0 0 1 12 0v1', 'M16 3.5a4 4 0 0 1 0 7.5', 'M22 21v-1a4 4 0 0 0-3-3.9', 'M9 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8'],
  advance: ['M5 12h14', 'M13 6l6 6-6 6'],
  back: ['M19 12H5', 'M11 6l-6 6 6 6'],
  settings: ['M12 2v3', 'M12 19v3', 'M4.9 4.9l2.1 2.1', 'M17 17l2.1 2.1', 'M2 12h3', 'M19 12h3', 'M4.9 19.1L7 17', 'M17 7l2.1-2.1', 'M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10'],
}
function icon(name: string, size: number, color: string): any {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    ...(ICONS[name] ?? []).map((d: string) => h('path', { d }))
  )
}

function bottomNav(active: string): any {
  const items: Array<[string, string]> = [
    ['HOME', 'home'],
    ['CONTACTS', 'contacts'],
    ['ADVANCE', 'advance'],
    ['SETTINGS', 'settings'],
  ]
  return box(
    {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: px(84),
      background: '#121316',
      borderTop: `${px(1)}px solid ${C.border}`,
      justifyContent: 'space-around',
      paddingTop: px(14),
    },
    ...items.map(([label, key]) =>
      box(
        { flexDirection: 'column', alignItems: 'center', width: px(90) },
        box({ marginBottom: px(6) }, icon(key, px(20), key === active ? C.red : C.muted)),
        mono(label, { fontSize: px(9.5), color: key === active ? C.redText : C.muted })
      )
    )
  )
}

function statusBar() {
  return box(
    { height: px(50), alignItems: 'center', justifyContent: 'space-between', padding: `0 ${px(28)}px` },
    text('9:41', { fontFamily: 'Sans', fontWeight: 600, fontSize: px(16), color: C.text }),
    box(
      { alignItems: 'center' },
      box({ width: px(17), height: px(11), background: C.text, borderRadius: px(2), marginRight: px(6) }),
      box({ width: px(25), height: px(12), border: `${px(1.5)}px solid ${C.text}`, borderRadius: px(3.5) })
    )
  )
}

function phone(active: string, ...content: any[]): any {
  return box(
    {
      position: 'absolute',
      left: 100,
      top: 760,
      width: 1120,
      height: 2120,
      borderRadius: 110,
      border: '14px solid #1f2024',
      background: C.bg,
      backgroundImage: `radial-gradient(60% 30% at 50% -4%, rgba(255,46,62,0.12) 0%, rgba(255,46,62,0) 70%)`,
      flexDirection: 'column',
      overflow: 'hidden',
    },
    statusBar(),
    box({ flexDirection: 'column', padding: `${px(8)}px ${px(18)}px 0` }, ...content),
    bottomNav(active)
  )
}

function caption(kicker: string, title: string, sub: string): any {
  return box(
    { position: 'absolute', left: 110, right: 110, top: 150, flexDirection: 'column' },
    mono(kicker, { fontSize: 40, letterSpacing: 6, color: C.red, marginBottom: 24 }),
    text(title, {
      fontFamily: 'Display',
      fontWeight: 700,
      fontSize: 168,
      lineHeight: 0.92,
      color: C.text,
      textTransform: 'uppercase',
      marginBottom: 34,
    }),
    text(sub, { fontFamily: 'Sans', fontWeight: 400, fontSize: 50, lineHeight: 1.35, color: '#a9acb2' })
  )
}

function frame(captionEl: any, phoneEl: any): any {
  return box(
    {
      width: W,
      height: H,
      position: 'relative',
      background: C.page,
      backgroundImage: `radial-gradient(70% 40% at 50% 0%, rgba(255,46,62,0.18) 0%, rgba(255,46,62,0) 70%)`,
    },
    captionEl,
    phoneEl
  )
}

function button(label: string, primary: boolean, style: any = {}): any {
  return card(
    {
      height: px(52),
      alignItems: 'center',
      justifyContent: 'center',
      background: primary ? C.redBg : C.card,
      borderColor: primary ? C.red : C.border,
      ...style,
    },
    text(label, {
      fontFamily: 'Sans',
      fontWeight: 700,
      fontSize: px(13),
      letterSpacing: px(1.2),
      color: primary ? C.redText : C.text,
    })
  )
}

function contactRow(name: string, phoneNo: string, tag?: string): any {
  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
  return box(
    {
      alignItems: 'center',
      padding: `${px(12)}px ${px(14)}px`,
      borderBottom: `${px(1)}px solid ${C.border}`,
    },
    box(
      {
        width: px(36),
        height: px(36),
        borderRadius: px(18),
        background: '#22242a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: px(12),
      },
      text(initials, { fontFamily: 'Sans', fontWeight: 600, fontSize: px(13), color: C.text })
    ),
    box(
      { flexDirection: 'column', flexGrow: 1 },
      text(name, { fontFamily: 'Sans', fontWeight: 600, fontSize: px(15), color: C.text }),
      text(phoneNo, { fontFamily: 'Sans', fontSize: px(12.5), color: C.muted, marginTop: px(2) })
    ),
    tag
      ? mono(tag, {
          fontSize: px(8.5),
          color: C.redText,
          border: `${px(1)}px solid #5a1e22`,
          padding: `${px(4)}px ${px(6)}px`,
        })
      : null
  )
}

// ---------- the four screens ----------

function shotHome() {
  const stat = (n: string, label: string) =>
    card(
      { width: px(196), height: px(96), alignItems: 'center', justifyContent: 'center' },
      text(n, { fontFamily: 'Mono', fontWeight: 600, fontSize: px(26), color: C.redText }),
      mono(label, { fontSize: px(9.5), marginTop: px(6) })
    )
  const recent = (title: string, meta: string, status: string) =>
    card(
      { padding: `${px(14)}px ${px(16)}px`, marginBottom: px(10) },
      box(
        { justifyContent: 'space-between', alignItems: 'center' },
        text(title, { fontFamily: 'Sans', fontWeight: 600, fontSize: px(15), color: C.text }),
        mono(status, { fontSize: px(9), color: status === 'SENT' ? C.muted : C.redText })
      ),
      text(meta, { fontFamily: 'Sans', fontSize: px(12.5), color: C.muted, marginTop: px(4) })
    )
  return frame(
    caption('Advance', 'Text your whole group', 'Personal texts to everyone you lead, sent from your own iPhone number.'),
    phone(
      'home',
      mono('Mission status — active', { color: C.red, fontSize: px(10.5), marginTop: px(8) }),
      text('SARAH', { fontFamily: 'Display', fontWeight: 700, fontSize: px(34), color: C.text, marginTop: px(2) }),
      text('Messages send from your own iPhone number via Apple Messages.', {
        fontFamily: 'Sans',
        fontSize: px(15),
        color: C.muted,
        lineHeight: 1.45,
        marginTop: px(4),
        marginBottom: px(18),
      }),
      box({ justifyContent: 'space-between', marginBottom: px(14) }, stat('124', 'Contacts'), stat('2', 'Active advances')),
      box(
        { justifyContent: 'space-between', marginBottom: px(26) },
        button('NEW ADVANCE', true, { width: px(196) }),
        button('ADD CONTACT', false, { width: px(196) })
      ),
      mono('Recent advances', { marginBottom: px(10) }),
      recent('Thursday Life Group', '18 people · Life Group', 'SENDING'),
      recent('Sunday serve reminder', '32 people · Worship Team', 'SENT'),
      recent('Youth night this Friday', '41 people · Youth', 'SENT')
    )
  )
}

function shotContacts() {
  const chip = (label: string, on: boolean) =>
    mono(label, {
      fontSize: px(9.5),
      color: on ? C.redText : C.muted,
      background: on ? C.redBg : 'transparent',
      border: `${px(1)}px solid ${on ? C.red : C.border}`,
      padding: `${px(9)}px ${px(11)}px`,
      marginRight: px(8),
    })
  return frame(
    caption('Groups', 'Everyone, organized', 'Sort people into Life Groups, teams, and classes. Text one group or all of them.'),
    phone(
      'contacts',
      box(
        { justifyContent: 'space-between', alignItems: 'center', marginTop: px(6), marginBottom: px(14) },
        text('CONTACTS', { fontFamily: 'Display', fontWeight: 700, fontSize: px(34), color: C.text }),
        box(
          {
            width: px(30),
            height: px(30),
            border: `${px(1)}px solid ${C.red}`,
            background: C.redBg,
            alignItems: 'center',
            justifyContent: 'center',
          },
          text('+', { fontFamily: 'Sans', fontSize: px(18), color: C.redText })
        )
      ),
      card(
        { height: px(46), justifyContent: 'center', padding: `0 ${px(14)}px`, marginBottom: px(12) },
        text('Search name or phone', { fontFamily: 'Sans', fontSize: px(15), color: C.dim })
      ),
      box({ marginBottom: px(12) }, chip('All', false), chip('Life Group', true), chip('Worship', false), chip('Youth', false)),
      box(
        { justifyContent: 'space-between', marginBottom: px(10) },
        text('18 contacts', { fontFamily: 'Sans', fontSize: px(12), color: C.muted }),
        text('Select all (18)', { fontFamily: 'Sans', fontWeight: 600, fontSize: px(12), color: C.redText })
      ),
      card(
        { padding: 0 },
        contactRow('Marcus Bell', '(512) 555-0142', 'Leader'),
        contactRow('Grace Kim', '(512) 555-0118'),
        contactRow('Daniel Ortiz', '(512) 555-0173'),
        contactRow('Hannah Price', '(512) 555-0126'),
        contactRow('Jordan Lee', '(512) 555-0190'),
        contactRow('Sarah Mitchell', '(512) 555-0155'),
        contactRow('Caleb Turner', '(512) 555-0161')
      )
    )
  )
}

function shotCompose() {
  const steps = box(
    { marginBottom: px(18) },
    ...[0, 1, 2, 3].map((i: number) =>
      box({ flexGrow: 1, height: px(3), background: i <= 1 ? C.red : '#2a2c31', marginRight: i < 3 ? px(6) : 0 })
    )
  )
  return frame(
    caption('Advances', 'Write once, send to all', 'Each text adds the person’s first name, so every message feels one-on-one.'),
    phone(
      'advance',
      box(
        { justifyContent: 'space-between', alignItems: 'center', marginTop: px(6), marginBottom: px(12) },
        box({ alignItems: 'center' }, icon('back', px(14), C.redText), mono('Back', { color: C.redText, marginLeft: px(6) })),
        mono('New advance', { color: C.text }),
        box({ width: px(50) })
      ),
      steps,
      mono('To', { marginBottom: px(8) }),
      card(
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: `${px(14)}px ${px(16)}px`, marginBottom: px(18) },
        text('Life Group', { fontFamily: 'Sans', fontWeight: 600, fontSize: px(15), color: C.text }),
        text('18 people', { fontFamily: 'Sans', fontSize: px(13), color: C.muted })
      ),
      mono('Message', { marginBottom: px(8) }),
      card(
        { padding: `${px(16)}px`, marginBottom: px(10) },
        text('Hey {first_name}! Life Group is this Thursday at 7pm at the Johnsons’. Bring a friend — we’ll have dinner ready. Reply if you can make it!', {
          fontFamily: 'Sans',
          fontSize: px(15.5),
          lineHeight: 1.5,
          color: C.text,
        })
      ),
      box(
        { marginBottom: px(20) },
        mono('+ First name', { fontSize: px(9), color: C.redText, border: `${px(1)}px solid #5a1e22`, padding: `${px(6)}px ${px(8)}px`, marginRight: px(8) }),
        mono('+ Last name', { fontSize: px(9), color: C.muted, border: `${px(1)}px solid ${C.border}`, padding: `${px(6)}px ${px(8)}px` })
      ),
      mono('Preview for Grace', { marginBottom: px(8) }),
      box(
        { justifyContent: 'flex-end', marginBottom: px(22) },
        box(
          { background: '#2b7cf6', borderRadius: px(18), padding: `${px(10)}px ${px(14)}px`, maxWidth: px(320) },
          text('Hey Grace! Life Group is this Thursday at 7pm at the Johnsons’. Bring a friend — we’ll have dinner ready. Reply if you can make it!', {
            fontFamily: 'Sans',
            fontSize: px(14),
            lineHeight: 1.4,
            color: '#ffffff',
          })
        )
      ),
      button('CONTINUE', true)
    )
  )
}

function shotConnect() {
  return frame(
    caption('Contacts', 'Your contacts, one tap', 'Allow access once and your iPhone contacts are ready. You choose who gets added.'),
    phone(
      'settings',
      text('SETTINGS', { fontFamily: 'Display', fontWeight: 700, fontSize: px(34), color: C.text, marginTop: px(6), marginBottom: px(14) }),
      card(
        { padding: `${px(18)}px`, marginBottom: px(14), borderColor: C.red },
        mono('iPhone Contacts', { color: C.redText, marginBottom: px(8) }),
        text('Connect my Contacts', { fontFamily: 'Sans', fontWeight: 700, fontSize: px(19), color: C.text, marginBottom: px(6) }),
        text('Pull in names and phone numbers from your iPhone so you never type a number by hand.', {
          fontFamily: 'Sans',
          fontSize: px(14),
          lineHeight: 1.45,
          color: C.muted,
          marginBottom: px(14),
        }),
        box(
          { alignItems: 'center', marginBottom: px(14) },
          box({ width: px(10), height: px(10), borderRadius: px(5), background: '#3ccf7a', marginRight: px(8) }),
          text('Connected · 124 contacts added', { fontFamily: 'Sans', fontWeight: 600, fontSize: px(14), color: C.text })
        ),
        button('SYNC AGAIN', true)
      ),
      card(
        { padding: `${px(18)}px`, marginBottom: px(14) },
        mono('Test mode', { marginBottom: px(8) }),
        text('Send to yourself first', { fontFamily: 'Sans', fontWeight: 600, fontSize: px(16), color: C.text, marginBottom: px(4) }),
        text('Try any advance on your own number before it goes to your group.', {
          fontFamily: 'Sans',
          fontSize: px(13.5),
          lineHeight: 1.45,
          color: C.muted,
        })
      ),
      card(
        { padding: `${px(18)}px` },
        mono('Opt-outs', { marginBottom: px(8) }),
        text('Replies of STOP are honored automatically', { fontFamily: 'Sans', fontWeight: 600, fontSize: px(16), color: C.text, marginBottom: px(4) }),
        text('Anyone who opts out is never messaged again.', { fontFamily: 'Sans', fontSize: px(13.5), lineHeight: 1.45, color: C.muted })
      )
    )
  )
}

export const SHOTS: Array<() => any> = [shotHome, shotConnect, shotContacts, shotCompose]
