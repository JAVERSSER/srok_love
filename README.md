# SrokLove 💗

A Cambodia-focused dating app demo built with **React Native + TypeScript + Expo + Expo Router**.
Accounts and profile photos use the Django backend (`http://139.59.249.224` by default);
discovery, matches and chat have no backend endpoints yet, so Discover is empty until
they're added. There is no mock or demo data in the app.

## Backend

- Config: `constants/api.ts` (base URL + endpoint paths). Override the server with
  `EXPO_PUBLIC_API_URL=http://<host>:8000` in a `.env` file.
- Client: `services/api.ts` — login, token refresh (automatic on 401), photo upload/assign.
- Web production builds call `/api/*` on their own origin and `vercel.json` proxies it to
  the VPS, because an HTTPS page can't call a plain-HTTP server directly.

## Requirements

- Node.js 18+ (LTS recommended)
- Expo CLI (`npx expo` works without global install)
- Expo Go app on your iPhone/Android, or an iOS Simulator / Android Emulator

## Run it

```bash
npm install
npx expo start
```

Then scan the QR code with the **Expo Go** app (Android) or the **Camera** app (iOS),
or press `i` for iOS simulator / `a` for Android emulator.

## What's included

- Welcome + 3-step onboarding (skippable, saved locally)
- Profile creation flow (name, age, gender, province, bio, interests, etc.)
- **Discover** with swipeable cards (right = like, left = pass, up = super like)
  built on Reanimated + Gesture Handler, with rotation + LIKE/PASS/SUPER indicators
- Tap a card → full **profile detail** with photo carousel, report & block
- **Likes** grid, **Matches** list, **Messages** list, **chat**
- Match modal animation when there's a mutual like
- **Profile** tab + Edit Profile, Discovery Preferences, Notifications, Privacy, Safety
- Report reasons + block confirmation (removes from Discover & Matches)
- Local persistence via AsyncStorage — state survives app restart

## Structure

```
app/          screens & routes (expo-router)
components/    reusable UI (ProfileCard, MatchModal, etc.)
constants/     colors, spacing, provinces
data/          empty starting profile for a new account
models/        TypeScript interfaces
services/      API client, AsyncStorage wrapper
store/         Zustand store (all business logic)
```

## Making it production-ready later

Business logic lives in `store/appStore.ts` and data access in `services/storage.ts`.
To add a Node.js/Express + PostgreSQL backend, replace the mock reads/writes in the
store with API calls — the UI layer won't need to change.
