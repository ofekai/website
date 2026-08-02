# Deploy cutover — one-time checklist

The site currently serves from a branch. This switches it to building with GitHub Actions, so the
repo stops carrying build output. `.github/workflows/deploy.yml` is already committed and inert;
it starts doing anything the moment step 2 flips the source.

**Do these in order. Step 3 is the one that bites.**

---

### 0. Before you push — diff the build against what is actually live

This working copy started life as an extracted zip, not as a clone of the repo, so it may be
stale relative to the real `main`. Confirm that before overwriting anything:

```bash
git remote -v                      # confirm the remote is the real repo
git fetch origin
git log --oneline origin/main -5   # does this match what you expect?
git diff origin/main --stat        # what would this push actually change?
```

Also compare the built page against production, so you know what visitors will see change:

```bash
npm run build
npx serve dist                     # then open it next to https://www.ofektaiwan.com
```

Commit `0995c60` is a snapshot of the original static site as it was before the migration —
useful as a reference point for that comparison.

If `origin/main` contains commits this folder doesn't have, stop and reconcile first.

---

### 1. Push

You do this yourself:

```bash
git push origin main
```

Nothing deploys yet — the Pages source is still the branch. This is deliberate: the workflow will
run, but publishing is not wired up until the next step.

---

### 2. Switch the Pages source

**Settings → Pages → Build and deployment → Source**: change from *Deploy from a branch* to
**GitHub Actions**.

The workflow then runs on the commit you just pushed (or trigger it by hand from the Actions tab
via *Deploy to GitHub Pages* → *Run workflow*).

---

### 3. Immediately re-check the domain and HTTPS ⚠️

**Do this the moment step 2 completes — not after the deploy finishes.**

Still on **Settings → Pages**, confirm both:

- **Custom domain** is still `www.ofektaiwan.com`
- **Enforce HTTPS** is still ticked

Changing the Pages source can silently clear either one. This matters because:

- if the custom domain gets unset, re-adding it triggers certificate re-provisioning, which can
  take **up to 24 hours** — during which the site is unreachable over HTTPS;
- if *Enforce HTTPS* gets unticked, the site quietly starts answering on plain HTTP.

If the domain field is empty, put it back straight away. The sooner it is restored, the more
likely the existing certificate is simply reused instead of reissued.

Then confirm from outside GitHub:

```bash
curl -sI https://www.ofektaiwan.com | head -1        # expect HTTP/2 200
curl -sI http://www.ofektaiwan.com | head -2         # expect a 301 to https
curl -s https://www.ofektaiwan.com/CNAME             # expect www.ofektaiwan.com
```

---

### 4. Verify the deploy

- The Actions run is green, and the *github-pages* environment shows the new deployment.
- The live page loads with no console errors and no 404s.
- `https://www.ofektaiwan.com/robots.txt` and `/sitemap.xml` both resolve.

---

### 5. Rollback

If anything is wrong and you want the old site back immediately:

**Settings → Pages → Source → back to *Deploy from a branch***, pointing at whichever branch and
folder was serving before the cutover. That restores branch-serving without needing a revert or a
new build.

Then re-check the custom domain and *Enforce HTTPS* again — flipping the source back can clear
them just as flipping it forward can.

Commit `0995c60` is the pre-migration snapshot of the original static site if you need to
reconstruct exactly what was being served.

---

### Notes

- An Actions deploy **replaces the entire published tree**. `public/CNAME` is what keeps the
  custom domain working across deploys, so it must never be deleted — and the Settings → Pages
  custom domain field must agree with it.
- `sharp` is declared as an explicit dependency rather than left to Astro's optional resolution.
  Without that, a lockfile generated on macOS can omit the Linux binary the runner needs, and the
  image pipeline fails only in CI.
