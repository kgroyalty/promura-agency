#!/usr/bin/env bash
# Promura Agency - P1 brand-leak batch fix
# Generated from Phase E audit. Run from repo root.
# Review every diff before committing.
set -euo pipefail
IFS=$'\n\t'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# P1#6 - fix gitroomhq/postiz-app link in all locale JSONs.
# Operator's fork URL becomes the source-of-truth GitHub link in user-facing FAQ.
find libraries/react-shared-libraries/src/translation/locales \
  -name 'translation.json' \
  -exec sed -i.bak 's|https://github.com/gitroomhq/postiz-app|https://github.com/kgroyalty/promura-agency|g' {} +
find libraries/react-shared-libraries/src/translation/locales -name '*.bak' -delete

# P1#12 - TikTok default hashtag visible to creators uploading video.
sed -i.bak 's|#Postiz|#PromuraAgency|g' \
  apps/frontend/src/components/new-launch/providers/tiktok/tiktok.provider.tsx
rm -f apps/frontend/src/components/new-launch/providers/tiktok/tiktok.provider.tsx.bak

# P1#13 - Moltbook agent name placeholder.
sed -i.bak 's|MyPostizAgent|MyPromuraAgent|g' \
  apps/frontend/src/components/launches/web3/providers/moltbook.provider.tsx
rm -f apps/frontend/src/components/launches/web3/providers/moltbook.provider.tsx.bak

# P2#2 - Postiz purple hover on magenta buttons; switch to darker magenta for
# brand-consistent active state.
sed -i.bak 's|hover:bg-\[#5520CB\]|hover:bg-[#cc3399]|g' \
  apps/frontend/src/components/developer/developer.component.tsx \
  apps/frontend/src/components/public-api/public.component.tsx
rm -f apps/frontend/src/components/developer/developer.component.tsx.bak
rm -f apps/frontend/src/components/public-api/public.component.tsx.bak

# P1#18 - Onboarding "Get Started" gradient; replace Postiz purple with Promura
# pink-to-magenta gradient.
sed -i.bak '
  s|from-\[#622aff\] to-\[#8b5cf6\] hover:from-\[#7c3aff\] hover:to-\[#9d6eff\]|from-[#ff3daa] to-[#ff6ec4] hover:from-[#ff5cb7] hover:to-[#ff7fcd]|g
  s|shadow-purple-500/25|shadow-pink-500/25|g
  s|shadow-purple-500/40|shadow-pink-500/40|g
' apps/frontend/src/components/onboarding/onboarding.modal.tsx
rm -f apps/frontend/src/components/onboarding/onboarding.modal.tsx.bak

echo "P1 batch applied. Review:"
git status --short
echo ""
git diff --stat
