# CoupleChat

A private, one-on-one messaging app for couples, built with React + Vite,
Firebase v11 (modular SDK), Firestore, TailwindCSS, React Router, and
Framer Motion.

## Features

**Auth**
- Email/password Register, Login, Logout, Forgot Password
- Persistent sessions (`browserLocalPersistence`)
- Route protection (`ProtectedRoute` / `PublicRoute`)
- Atomic registration: a Firestore transaction creates `users/{uid}` and
  `usernames/{username}` together, and rolls back the Auth account if
  either write fails or the username was claimed in a race

**Partner linking**
- Search a partner by username and send a connect request
- Live incoming-request banner with Accept / Decline
- Accepting links both accounts (`partnerUid` set on each) in one flow,
  with no backend function — see the rules notes below
- Unlink from the Profile page

**Chat**
- Real-time one-on-one messaging (Firestore `onSnapshot`)
- Auto-scrolling message list, sent/received bubbles, timestamps
- Live partner online/offline status
- Enter-to-send input bar

**Profile / Settings**
- Edit display name and bio
- Pick an accent color (used for your message bubbles + send button)
- Pick a chat wallpaper
- Username and email are shown but not editable (username is permanent)

**UI**
- Dark glassmorphism, animated with Framer Motion, toast notifications,
  inline validation, loading states throughout

## Getting Started

```bash
npm install
npm run dev
```

Firebase config is wired via env vars in `.env` (copy `.env.example` for a
blank version). See the Vercel section below for deploying.

## Firestore Setup

1. Firebase console → **Authentication → Email/Password** → enable.
2. Create a **Firestore** database (production mode).
3. Deploy `firestore.rules`:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Data Model

```
users/{uid}
  uid, username (immutable), displayName, email, photoURL, bio
  partnerUid: string | null
  createdAt, lastSeen, isOnline
  theme: 'purple' | 'blue' | 'pink'
  wallpaper: 'aurora' | 'midnight' | 'sunset'

usernames/{username}
  uid                          // reservation record, guarantees uniqueness

partnerRequests/{recipientUid}
  fromUid, fromUsername, fromDisplayName, createdAt
                                // one pending request per recipient

chats/{chatId}                 // chatId = [uidA, uidB].sort().join('_')
  participants: [uidA, uidB]
  lastMessage, updatedAt

chats/{chatId}/messages/{messageId}
  text, senderId, createdAt
```

## Registration Flow & Rollback

`src/lib/authService.js` → `registerUser()`:
1. Pre-checks `usernames/{username}` (fast fail before touching Auth).
2. Creates the Firebase Auth account, sets the Auth `displayName`.
3. Runs a Firestore **transaction** that re-checks the username (closing
   the race window) and writes `users/{uid}` + `usernames/{username}`
   atomically.
4. If step 2 or 3 throws, the just-created Auth account is deleted so no
   orphaned account is left without a Firestore profile.

## Partner Linking Without a Backend Function

Accepting a request needs to write `partnerUid` on **two** different
users' documents — the accepter's own doc (normal owner-write) and the
sender's doc (a cross-user write). Without Cloud Functions, that second
write is authorized in `firestore.rules` by a narrow function,
`isAcceptingPartnerLink()`, which only allows it when:
- the accepter has a real pending `partnerRequests` doc from that exact
  sender, **and**
- the write touches nothing but the `partnerUid` field, set to the
  accepter's own uid.

Unlinking mirrors this with `isUnlinkingPartner()`. In a larger production
system you'd likely move this into a Cloud Function for a true atomic
guarantee and simpler rules — this rules-only approach is the pragmatic
client-only alternative and is scoped tightly on purpose.

`src/lib/chatService.js` → `sendMessage()` similarly avoids a
single-transaction pattern: it writes the parent `chats/{chatId}` doc
first (so the `participants` array the rules depend on exists), then adds
the message — Firestore rules evaluated inside a transaction don't see
other pending writes from that same transaction, so combining these two
into one transaction would fail the very first message of a new chat.

## Folder Structure

```
src/
  App.jsx        Router setup
  main.jsx       React entry point
  index.css      Tailwind + global styles

  components/    UI + layout + route guards
    Input.jsx, Button.jsx, Spinner.jsx, MessageBubble.jsx, Navbar.jsx
    AuthLayout.jsx
    ProtectedRoute.jsx, PublicRoute.jsx

  pages/
    Login.jsx, Register.jsx, ForgotPassword.jsx
    Home.jsx           post-login router (chat vs link-partner)
    LinkPartner.jsx     send/accept/decline partner requests
    Chat.jsx            real-time messaging
    Profile.jsx         edit profile, theme, wallpaper, unlink
    NotFound.jsx

  lib/           Firebase, business logic, state, helpers
    config.js, authService.js, userService.js, usernameService.js
    partnerService.js, chatService.js, theme.js
    AuthContext.jsx, ToastContext.jsx
    useAuth.js, useUsernameCheck.js
    validators.js, errors.js
```

## Deploying to Vercel

`vercel.json` is already set up:
- Build command `npm run build`, output directory `dist`.
- SPA rewrite (`/(.*) → /index.html`) so client-side routes like `/chat`
  don't 404 on a hard refresh.

**Steps:**
1. Push to a repo (`.env` is gitignored — don't commit real keys).
2. Vercel → **New Project → Import**. Vite is auto-detected.
3. **Settings → Environment Variables** — add every key from
   `.env.example` with real values, for Production, Preview, and
   Development. Vite inlines `VITE_*` vars at **build time**, so a local
   `.env` never reaches Vercel's build — this step is required.
4. Deploy.
5. **Firebase Console → Authentication → Settings → Authorized domains** —
   add your `*.vercel.app` domain (and any custom domain). Skipping this
   causes `auth/unauthorized-domain` on the live site even though it works
   on `localhost`.
6. Redeploy after any env var change — Vercel doesn't hot-reload
   build-time vars into an already-built deployment.

## Security Notes

- All client-side validation is UX-only; `firestore.rules` is the real
  enforcement layer — see the "Partner Linking" section above for the
  most delicate part of it.
- Immutable fields (`uid`, `username`, `email`, `createdAt`) can't be
  changed by a normal owner update.
- Chat documents and their messages are only readable/writable by the two
  listed `participants`.
- Firebase error codes are mapped to safe, user-facing messages in
  `lib/errors.js` — raw Firebase internals are never shown to users.
