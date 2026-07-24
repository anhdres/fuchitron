# Features

## Remote spectator link (2026-04-01)
- Create a match → generate a unique link → share it → others follow the score in real time
- "Broadcast mode" — the match is streamed to a public URL
- Users without the app installed can view the score via the URL
- Uses Supabase for state sync (matches table) + path-based code in the URL
