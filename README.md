# RentCheck

**Review apartment listings with your roommates before you sign.**

Live app: https://rentcheck.app.space

RentCheck helps students avoid bad leases. Paste a listing, get an AI summary of costs and red flags, invite your roommates, and vote together in real time.

## What it does

1. **Save a listing.** Paste the listing text, with optional rent and address.
2. **AI summary.** One click summarizes costs, requirements, warning signs, and questions to ask the landlord. It only uses facts from the listing and says "Not mentioned" instead of guessing.
3. **Invite roommates.** The creator shares a hard-to-guess invite link and can turn it off or remove people.
4. **Vote live.** Everyone votes Good fit, Needs questions, or Reject, with an optional comment. Votes appear on every screen instantly, with no refresh.
5. **Shared decision.** Any Reject means **Pass**. All Good fit means **Go for it**. Anything else means **Ask the landlord first**.

## DeepSpace features used

| Feature | How RentCheck uses it |
|---|---|
| Authentication | Google sign-in. Every page with data requires sign-in. |
| Collections + permissions | Listings, votes, and invites are collections. Permissions are enforced on the server: only the creator and invited roommates can read a listing, and only the creator can edit, delete, or invite. Strangers get "Listing not found," even with the direct URL. |
| Server actions | Invites, votes, and removing roommates run on the server, which checks the caller before writing. |
| AI | `createDeepSpaceAI` runs on the server, so no keys reach the browser. The summary is saved on the listing and cleared when the listing is edited. |
| Real-time sync | Votes and comments update live for everyone through DeepSpace's RecordRoom. |
| Deploy | `npx deepspace deploy` to rentcheck.app.space. |

## Main tradeoff

I chose depth over breadth. Instead of many half-working features, I built one complete flow (listing, AI summary, invite, live vote, decision) and tested it with two real accounts.

What I left out on purpose:
- **Presence ("who's viewing"):** the generic presence route didn't check listing membership, so adding it could leak who is looking at a private listing.
- **Email invites:** an invite link does the same job with fewer moving parts.
- **Lease PDF upload, neighborhood search, maps, payments, mobile app:** they add risk without improving the core decision flow.

## How I worked with the coding agent

I used GitHub Copilot in Agent mode with DeepSpace's official agent skill installed, so it used DeepSpace's built-in tools instead of writing its own auth or database.

My process for each feature:
1. Ask Copilot for a plan first, with no code.
2. Review the plan and add rules (for example: roommates are read-only, treat listing text as untrusted data, removing a roommate deletes their vote).
3. Approve each terminal command myself (manual permissions).
4. Test by hand before accepting the changes.

The full step-by-step history is in [BUILD_LOG.md](BUILD_LOG.md).

## Bugs I found by testing myself

Automated checks passed in each of these cases, but manual testing found the bug:

| Bug | Cause | Fix |
|---|---|---|
| Edit button did nothing | File-based routing made the detail page a layout for the edit page | Flattened the edit route |
| AI summary failed | Output limit too low, so the AI's answer was cut off mid-sentence (found after adding server-side error logging) | Raised the limit and capped list lengths |
| Valid invite link showed "Listing not found" | Bug in the invite join flow; automated tests had skipped the two-account case | Fixed, with a new test reproducing it |
| Empty "optional" comment blocked saving a vote and showed a raw error code | Comment validation was too strict | Blank comments now save, and users see friendly error messages |

## Testing

- `npm run lint`, `npm run type-check`, and `npm run test:unit` pass (25 unit tests), including server-side permission tests.
- End-to-end tests: 11 passed, 4 skipped (no DeepSpace test accounts available).
- Manual testing with two Google accounts side by side: invite, read-only roommate, live votes, decisions, removing a roommate, stranger blocked by direct URL.

## Run it locally

```bash
npm install
npx deepspace dev start
```

Open http://localhost:5173.

## Future work

- Presence, once the presence route checks listing membership
- Flag mismatches between the rent field and the listing text
- Lease PDF upload
- Automated two-account tests using DeepSpace test accounts
