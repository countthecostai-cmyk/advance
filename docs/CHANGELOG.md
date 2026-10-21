# Changelog

## 2026-10-21
- Automatic reminders: a daily job nudges people who haven't answered an RSVP (up to 2 times), sends a day-before heads-up to people who said going, and tells leaders who missed a meeting. Reminders show on Home.
- Catch Me Up: every contact page now summarizes recent texts and holds notes, promises and follow-ups with due dates.
- Fix: events now create an RSVP row for every group member (leaders could not see who hadn't replied).
- Scheduled sending: pick a date/time when creating an advance. The person's iPhone runs a Time of Day automation that calls /api/shortcut/due/<private link>; due advances start and hand off to the Advance Sender Shortcut with no tapping. Setup page: /auto-send.
