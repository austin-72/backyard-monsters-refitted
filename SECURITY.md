# Security policy (Inferno Map Room 2)

This policy is for this fork and for the servers that run it, such as https://inferno.maproom2.com.
It is not the upstream Backyard Monsters Refitted policy. The upstream team does not run this server and
cannot fix it, so do not send reports about it to them.

## Where to report

Send reports to **the server's admin contact (set this before going public)**.

> Operators: replace the line above with a real, private contact (an email address you read, or a
> private message channel) before the server is public. Do not use a public issue tracker or a public
> chat channel for it.

Please do not post a vulnerability in public: not in the game's chat, not on the alliance board, not in a
public issue or on Discord. Give the operator time to fix it first.

Include:
- what the problem is and what someone could do with it;
- the steps to reproduce it, and the route or screen involved (for example `/admin/api/...`,
  `/api/.../base/save`, `/chat/poll`);
- the client build, if it matters (the page's settings, Troubleshooting, shows the build number);
- whether you tested on your own copy or on the live server.

Do not include other players' data, passwords or login tokens in a report. If you saw some by accident,
say so, and say what you saw, without copying it.

## Test on your own copy

Set up your own server first (`RUNNING-INFERNO-ONLY.md`: Docker runs everything). The live server has real
players: testing against it can spoil the game for them.

Almost every kind of problem reproduces on a local copy: login and token checks, the admin panel, saves,
attacks, the Brimstone Pit, chat, rate limits. Report it from there.

The exception is a problem that only exists on the live setup: the server's own address reachable
without the tunnel, a proxy or tunnel mistake, TLS. For these, send as few requests as you need to
confirm it (fewer than ten), then stop and report what you have.

## In scope

- The game server in `server/` and the browser client in `client-web/`, as this fork changed them.
- The admin panel (`/admin`) and its sign-in, admin test mode and the Designer.
- Logins, saved logins and sessions; the password reset.
- Anything that lets one player change another player's yard, resources, Shiny or account.
- The Brimstone Pit and the Devil's Arcade where a flaw creates Shiny, resources or scores out of
  nothing, or affects other players.
- One cheap request that makes the server do a lot of work (it slows the game for everyone).
- Ways round the rate limits, or round the cheat detector that would let forged requests through
  unreported.

## Out of scope

- Floods of traffic, stress tests, or anything that tries to wear out the server's bandwidth, CPU or
  connections.
- Changing your own game so it plays differently only for you. Requests that no fair game can send are
  what the cheat detector is for; a way to get past it is in scope.
- Reports from automatic scanners with no working proof.
- Tricking players or staff (social engineering).
- Problems in the upstream project's code that this fork did not change. Report those to the upstream
  project as its own policy says. The operator may pass a report on to them.

## What the operator will do

The operator will say when the report has arrived, look at it, and fix what is confirmed. This is a small
server run by its operator, so no response time is promised. Fixes reach players when the server is
updated and, for the client, when a new build is published.

## Good faith

The operator will not take action against someone who follows this policy: tests on their own copy, keeps
any check on the live server within the limits above, does not look at or keep other players' data, does
not spoil the game for others, does not destroy data, and reports promptly.

If you plan any test against the live server, tell the operator first through the contact above.

## For operators

- Set the contact at the top of this file before the server is public.
- A real `SECRET_KEY`, `ENV=production` and the other release settings: `RELEASE-CHECKLIST.md`, step 1.
- Keep the server's own port reachable only through the tunnel or proxy: `GOING-PUBLIC-CLOUDFLARE.md`,
  section 5.
- Never put secrets (the tunnel token, `SECRET_KEY`, database passwords) in the repository, in
  screenshots or in bug reports: `OPERATIONS-LOGS-AND-SECRETS.md`, section 2.
