# SrokLove 💗

A Cambodia-focused dating app demo built with **React Native + TypeScript + Expo + Expo Router**.
Everything runs on the Django backend (`https://api.slanh.site` by default). There is no
mock or demo data in the app.

## Backend

- Config: `constants/api.ts` (base URL + endpoint paths). Override the server with
  `EXPO_PUBLIC_API_URL=https://<host>` in a `.env` file. The backend is HTTPS and WSS only.
- Client: `services/api.ts`. Auth is in HttpOnly cookies, so every call sends cookies, and a
  401 gets one automatic refresh before the user is sent to login. One device can be logged
  in per user, so a login elsewhere ends this session.
- Sockets: `services/socket.ts`. Close code 4001 goes to login and 4003 leaves the chat;
  neither reconnects. Native apps send an `Origin` header (`EXPO_PUBLIC_SOCKET_ORIGIN`,
  default: the API origin), which must be on the backend's allowed list.
- Web builds call `/api/*` on their own origin and `vercel.json` proxies it to the VPS. Vercel
  can't proxy sockets, so on slanh.site `api/proxy.js` sets the auth cookies on `.slanh.site` and
  the browser connects straight to `wss://api.slanh.site`. The backend must allow the socket
  origin `https://www.slanh.site`. Other web hosts fall back to polling and HTTP sends.
  The backend needs to read the client IP from `X-Forwarded-For` for its per-IP rate limits.
- Password reset is hidden (`PASSWORD_RESET_AVAILABLE`) until the backend delivers OTP codes.

## Push notifications

The app uses `expo-notifications` (`services/push.ts`). After login it asks for
permission, gets the phone's **Expo push token** and sends it to the backend.
The backend sends pushes through Expo's push service.

**App setup (once):** run `npx eas init` so `app.json` gets an EAS project id.
Remote push doesn't work in Expo Go on Android, so test on a development build
(`npx eas build --profile development`) on a real phone. Simulators can't receive pushes.

**Backend contract** (`endpoints.pushDevices` in `constants/api.ts`):

| Request | Body | Meaning |
|---|---|---|
| `POST /api/notifications/devices/` | `{ "token": "ExponentPushToken[...]", "platform": "ios" \| "android" }` | Save this token for the logged-in user (upsert by token) |
| `DELETE /api/notifications/devices/` | `{ "token": "..." }` | Forget the token (sent on logout) |

To notify a user, POST to `https://exp.host/--/api/v2/push/send` with one message per token:

```json
{
  "to": "ExponentPushToken[...]",
  "title": "It's a match! 🎉",
  "body": "You matched with Dara!",
  "sound": "default",
  "channelId": "default",
  "data": { "type": "match", "userId": 42 }
}
```

`data.type` is `"match"`, `"message"` or `"like"`. `data.userId` is the other person's id.
Tapping a push opens their chat (message/match) or profile (like). Every push also
appears on the Notifications screen.

Minimal Django side:

```python
# models.py
class PushDevice(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_devices")
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=10, blank=True)

# views.py (DRF)
class PushDeviceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token", "")
        if not token.startswith("ExponentPushToken"):
            return Response({"detail": "Invalid token"}, status=400)
        PushDevice.objects.update_or_create(
            token=token, defaults={"user": request.user, "platform": request.data.get("platform", "")}
        )
        return Response(status=204)

    def delete(self, request):
        PushDevice.objects.filter(user=request.user, token=request.data.get("token")).delete()
        return Response(status=204)

# push.py: call send_push(user, ...) from your match / message / swipe code
import requests

def send_push(user, title, body, data):
    tokens = list(user.push_devices.values_list("token", flat=True))
    if not tokens:
        return
    res = requests.post(
        "https://exp.host/--/api/v2/push/send",
        json=[{"to": t, "title": title, "body": body, "sound": "default",
               "channelId": "default", "data": data} for t in tokens],
        timeout=10,
    )
    # Drop tokens Expo says are dead (app uninstalled, etc.).
    for t, ticket in zip(tokens, res.json().get("data", [])):
        if ticket.get("details", {}).get("error") == "DeviceNotRegistered":
            PushDevice.objects.filter(token=t).delete()

# urls.py
path("api/notifications/devices/", PushDeviceView.as_view()),
```

Example, when two users match: `send_push(other, "It's a match! 🎉", f"You matched with {me.name}!", {"type": "match", "userId": me.id})`.

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
- **Discover** with swipeable cards (right = like, left = pass)
  built on Reanimated + Gesture Handler, with rotation + LIKE/PASS indicators
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
