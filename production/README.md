# HeyGen broadcast production

Target: one consistent, sober newsroom presenter using an eligible Avatar V Digital Twin at 1080p with a natural English voice. HeyGen generates the video and synchronized speech together. Select the presenter and voice from the connected account; do not invent avatar or voice IDs.

Connection is currently missing. Put HEYGEN_API_KEY, HEYGEN_AVATAR_ID and HEYGEN_VOICE_ID in the process environment, never in dist or browser storage. The runner does not automatically source .env files.

1. `python3 scripts/heygen.py catalog` retrieves the account's first page of avatar/voice choices. Follow returned pagination if the desired look is absent.
2. Verify each bulletin's reporting time and claims against an archived broadcast. Add its source URLs, explain time precision, then change editorial_status to verified. All current entries still require this review. The CNN first-segment header says 08:48 ET, while common descriptions give approximately 08:49; its paragraphs have no individual timestamps. Do not infer per-paragraph times from that header.
3. Render the selected bulletin with `python3 scripts/heygen.py render --bulletin bulletin-01`. This spends HeyGen credits. Check the account cost before submitting a full batch.
4. Collect it with `python3 scripts/heygen.py poll --bulletin bulletin-01`. Repeat polling after a reasonable interval if pending. A network-uncertain submission is deliberately retained for reconciliation rather than automatically resubmitted.
5. Inspect the pilot's voice, lip sync, tone and framing before rendering the remainder. The runner downloads MP4 output because provider URLs expire, and writes dist/media.json for playback. The published site needs a new source save and deployment to include generated files.

The production runner is implemented against documented v3 endpoints but has not been live-tested: there is no connected HeyGen account. The frontend preserves explicit browser-voice fallback for bulletins without a matching generated clip. It does not label fallback audio as HeyGen.
