#!/usr/bin/env bash
# Uploads premium SKILL.md bodies into the PREMIUM_SKILLS KV namespace.
# Premium skills are delivered to paying customers by signed email links -
# they are gitignored and must never be committed to the public repo.
set -e
# The Worker serves the free skill from KV key "free:zeroshot" - upload it too.
npx wrangler kv key put --binding=PREMIUM_SKILLS "free:zeroshot" \
  --path "../../skills/zeroshot/SKILL.md" --remote
echo "uploaded: free:zeroshot"
for f in descent diffusion dropout gaussian backprop relu; do
  if [ -f "../../skills-premium/$f/SKILL.md" ]; then
    npx wrangler kv key put --binding=PREMIUM_SKILLS "$f" \
      --path "../../skills-premium/$f/SKILL.md" --remote
    echo "uploaded: $f"
  fi
done
