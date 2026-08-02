# Dates and time zones

How WordHabit represents time, why, and the traps that motivated the
rules. Applies to both this API and the Flutter client — the two agree on
a shared vocabulary, and most of the bugs below came from one side
breaking that agreement.

## 1. The distinction that explains everything

There are only **two** kinds of temporal value. Nearly every date bug
comes from confusing them.

| | **Instant** | **Calendar day** |
|---|---|---|
| What it is | A point on the timeline | A label: `2026-07-31` |
| Carries a zone? | No — it is absolute | No — it does not need one |
| Converted? | Yes, to **display** it | **Never** |
| Correct type | `Date` / `DateTime` | `String` |
| Examples here | `lastReviewedAt`, `sentAt`, `createdAt` | `localDate`, `assignedFor`, `nextReviewOn` |

The test that settles it: **"can the same value name two different days
depending on where you are?"**

- "The moment a review was submitted" → yes → **instant**
- "The day a word belongs to" → no, it is the 31st for everyone → **label**

## 2. The five traps, with numbers

### Trap 1 — `toIso8601String()` on the client

```dart
DateTime.now().toIso8601String()   // converts to UTC first
```

A user in **Los Angeles** (UTC−7) opens the app on **31 July at 18:00**:

```
31 July 18:00 local  →  1 August 01:00 UTC  →  "2026-08-01"
```

The app reports **1 August** while the user is living the 31st. Their
streak breaks: the 31st is never recorded.

**The guard** — `formatLocalDay` (`lib/shared/utils/local_day.dart`) reads
`date.year/month/day`, the wall-clock fields. No conversion, no drift.

### Trap 2 — `DateTime.parse('2026-07-31')`

Dart reads a bare date as **UTC**. Rendered locally in Los Angeles:

```
2026-07-31T00:00:00Z  →  30 July, 17:00  →  "Thursday 30"
```

Wrong day, wrong weekday in the progress calendar.

**The guard** — `parseLocalDay` builds `DateTime(2026, 7, 31)`, a *local*
midnight.

### Trap 3 — `setHours(0, 0, 0, 0)` on the server

Server in **UTC**, user in **Tokyo** (UTC+9), it is **07:30 on 31 July**
where they are:

```
server: new Date() → 30 July 22:30 UTC → "the 30th"
```

The worker would announce "your word of the day" pointing at the **30th**
while the app displayed the **31st**.

**The guard** — the day is **supplied**, never derived. `localDate` comes
from the client (`?localDate=2026-07-31`); the notification worker, which
has nobody to ask, derives it from the device's IANA zone with `TZDate`.

### Trap 4 — a label typed as an instant

`assignedFor` used to be stored as `2026-07-31T00:00:00Z` and typed
`DateTime`. The type *invites* this:

```dart
DateFormat.yMMMd().format(todayWord.assignedFor.toLocal())
```

| Where | Shows |
|---|---|
| Paris (+2) | 31 July |
| Los Angeles (−7) | **30 July** |

**The guard** — make the type say what the value is: `String`,
`"2026-07-31"`. Nothing left to format, nothing left to get wrong. Same
philosophy as `Result`: make the error impossible rather than catching it.

### Trap 5 — an interval that is a day, stored as an instant

Review scheduling used to add days to the *moment* of the answer, keeping
its time of day. `findReviewQueue` then compared `nextReviewAt lte: now`:

```
reviewed at 07:35  →  due tomorrow 07:35
reminder fires at 07:30, the learner opens the app  →  queue empty by 5 minutes
```

Two failures in one. The queue was empty exactly when the notification
had just summoned the learner — and because one always answers a little
*after* a card falls due, the time crept later with every cycle, until a
morning learner had afternoon reviews.

**The guard** — "review in 3 days" is a calendar day. It is now
`nextReviewOn` (`yyyy-MM-dd`), computed with
`shiftLocalDate(localDate, interval)`, and the queue compares two labels:
`nextReviewOn <= localDate`. A card due tomorrow is there the moment the
learner enters their tomorrow, wherever they are.

Note what does **not** work: anchoring the instant to the day's start
instead. UTC midnight on 1 August is 09:00 in Tokyo — hidden all morning
— and 17:00 on 31 July in Los Angeles — due a day early. **A user's day
boundary cannot be expressed as a single instant without their zone.**

## 3. The only sanctioned bridge

`assignedFor` is a `DateTime` column, so a day has to be stored in it. It
is **encoded**, not converted:

```ts
localDateToInstant('2026-07-31')  →  2026-07-31T00:00:00.000Z   // same digits
instantToLocalDate(...)           →  '2026-07-31'                // exact round trip
```

Compare with a real conversion, which changes the day:

```
midnight 31 July in Paris  →  2026-07-30T22:00:00Z   ← the 30th!
```

**UTC here is an encoding, not a place.** It is chosen because it is
stable — no DST, no dependency on the deployment region — and because
both sides apply the same rule, so the key always matches.

## 4. Map of the codebase

| Need | Tool | Where |
|---|---|---|
| App declares its day | `formatLocalDay(localToday())` | `shared/utils/local_day.dart` |
| App reads a day back | `parseLocalDay` | `shared/utils/local_day.dart` |
| Server encodes a day | `localDateToInstant` | `learning/domain/services/local-date.ts` |
| Server decodes a day | `instantToLocalDate` | `learning/domain/services/local-date.ts` |
| Day arithmetic | `shiftLocalDate`, `daysBetweenLocalDates` | `learning/domain/services/local-date.ts` |
| Worker **derives** someone else's day | `TZDate(instant, timeZone)` | `notifications/domain/daily-word-schedule.ts` |
| A genuine instant | `new Date()` | `lastReviewedAt`, `sentAt` |

The last row is worth a note: the notifications worker is the **only**
place where the server computes someone else's day. The app is closed, so
nobody can tell it. That — and only that — is why `Device.timeZone`
exists.

## 5. Checklist

For any temporal value, in order:

1. **Instant or day?** Apply the test in §1.
2. **If a day**: type it `String`, format `yyyy-MM-dd`, never leave a
   stray `DateTime`. If it belongs to the user, it is *supplied* by the
   client, never derived from the server clock.
3. **If an instant**: store UTC, display local, and `new Date()` is
   legitimate.
4. **A parameter named `now`** must receive *now*. Otherwise rename it —
   a name that lies is what lets the bug through review.
5. **Never format a day in a time zone.** If the type allows it, the type
   is what needs changing.

A design rule to close on: when two notions are easy to confuse, **make
them differ by type**. A `String` and a `DateTime` cannot be mixed up; two
`DateTime`s, one of which is a day in disguise, eventually will be.
