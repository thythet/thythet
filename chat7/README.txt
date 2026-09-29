thechat v2.1.42

Upload the full contents of this folder to the web directory.

NEW: confirmed-friends messaging
- Users can discover people and send friend requests.
- Incoming requests can be accepted or declined.
- Sent requests can be cancelled.
- Confirmed friends appear in the Friends center.
- Private/direct messaging is locked unless both users are confirmed friends.
- Existing direct-chat history remains visible, but the composer is disabled when the friendship no longer exists.
- Group/channel member pickers now offer confirmed friends only for new rooms.
- Calls and reactions in a direct chat are also friend-gated.

Firebase Realtime Database:
This version introduces these paths:
  /friendRequests/{toUid}/{fromUid}
  /friendRequestsSent/{fromUid}/{toUid}
  /friends/{uid}/{otherUid}

If your existing database rules do not already allow authenticated participants to use these paths, merge firebase-friend-rules-snippet.json into the TOP-LEVEL "rules" object of your existing rules. It is a snippet, not a complete replacement for your current database rules.

PWA files: manifest.webmanifest, sw.js, icons/.

v2.1.42 fix:
- Friend request acceptance now creates friendship first, while the authorization request still exists.
- Request cleanup runs afterward and only removes crossed-request paths when they actually exist.
- Existing v2.1.40 Firebase friend rules remain compatible; no rule change is required for this fix.
