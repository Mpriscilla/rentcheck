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