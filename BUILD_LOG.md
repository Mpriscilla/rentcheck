# RentCheck Build Log

## Step 1: Setup
- Node was v18.17.1. Upgraded to v26.13.1 because the SDK needs a newer runtime.
- Created project with `npm create deepspace@latest rentcheck`
- Logged in with `npx deepspace auth login` using my CSUN email
- Registered the app with `npx deepspace app init`
- Ran locally at localhost:5173. Tested Google sign-in: works out of the box with DeepSpace auth.
- First deploy was blocked by an uncommitted macOS .DS_Store file. Added it to .gitignore, committed, redeployed.
- Live at https://rentcheck.app.space

## Step 2: GitHub
- First push failed with "Repository not found" because the repo didn't exist on GitHub yet
- Created the repo and pushed again: worked
- Two remotes: "origin" = GitHub (for reviewers), "space" = DeepSpace (for deploys)


## Step 3: Coding agent setup
- Installed DeepSpace's official agent skill so Copilot uses DeepSpace's built-in auth, data, and permissions instead of writing its own
- Checked that the skill came from DeepSpace's official GitHub before installing

## Step 4: Listings feature (Copilot)
- Asked Copilot for a plan first and reviewed it before approving
- Added rules: roommates read-only later, form validation, empty/error states, no commit/deploy by agent
- Copilot built: listings collection, list/create/detail/edit pages, creator-only permissions
- Copilot ran lint, type-check, 5 unit tests, and build: all passed

## Step 5: My manual testing
- Empty state shows "No listings yet": pass
- Blank title blocked: pass
- Rent of 0 shows "Rent must be a positive number": pass
- Saved a real listing and opened its detail page: pass
- Edit: FAILED. Clicking Edit did nothing, even though all automated checks passed.
  - My hypothesis: file-based routing made the detail page a layout for the edit page
  - Copilot found the same cause and flattened the edit route. Retested: pass
- Delete with confirmation pop-up: pass

## Step 6: More testing
- Local 404 on /listings in my normal Chrome window, while incognito and the live site worked with the same commit. In DevTools Network, the router bundle was served from memory cache: an old copy from before the listings routes existed. Fixed with "Disable cache" + hard reload.
- Permissions: signed in as a second Google account. The list showed "No listings yet," and opening my listing's direct URL showed "Listing not found." The server blocks access, not just the UI.


## Step 7: AI summary (Copilot + DeepSpace AI)
- Asked Copilot for a plan first. It chose DeepSpace's server-side createDeepSpaceAI so no keys reach the browser.
- My additions: friendly error if credits/AI fail, treat listing text as untrusted data, keep output small, prevent double-clicks.
- Summary is saved on the listing (no regeneration on refresh) and cleared when the listing is edited.
- Bug 1: "Summarize" showed the friendly error, but the server log hid the cause. Asked Copilot to log the real error server-side only.
- Bug 2: real error was "Unterminated string in JSON at position 615." The output token limit was too low (from my "keep it cheap" instruction), so the AI's answer was cut off. Fixed by raising the limit and capping list lengths.
- Tested: structured summary, flags cash deposit and non-refundable fee, no invented facts, legal note, persists on refresh, clears on edit, stranger still blocked.
- Note: AI used only the listing text ($1,850) even when the rent field said $1,900. It doesn't guess.