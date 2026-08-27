# SrokLove 💗

A Cambodia-focused dating app demo built with **React Native + TypeScript + Expo + Expo Router**.
Fully offline: all data is mock data persisted locally with AsyncStorage. No backend required.

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
- **Likes** grid, **Matches** list, **Messages** list, real **chat** with auto-replies (demo)
- Match modal animation when there's a mutual like
- **Profile** tab + Edit Profile, Discovery Preferences, Notifications, Privacy, Safety
- Report reasons + block confirmation (removes from Discover & Matches)
- Local persistence via AsyncStorage — state survives app restart
- 22 fictional Cambodian profiles (no real people)

## Testing the match flow

A subset of demo profiles "like you back" (Sreyneang, Sokha, Rachana, Chansopheak,
Kosal, Chenda, Nita, Dara). Like one of them to trigger the match animation, then chat.

## Structure

```
app/          screens & routes (expo-router)
components/    reusable UI (ProfileCard, MatchModal, etc.)
constants/     colors, spacing, provinces
data/          mock users + seed data
models/        TypeScript interfaces
services/      AsyncStorage wrapper
store/         Zustand store (all business logic — swap mock data for API later)
```

## Making it production-ready later

Business logic lives in `store/appStore.ts` and data access in `services/storage.ts`.
To add a Node.js/Express + PostgreSQL backend, replace the mock reads/writes in the
store with API calls — the UI layer won't need to change.
