# Forward Telnyx SMS

This Cloudflare Worker received SMS messages from Telnyx and forwards them to another phone number.

# Setup
- Set the environment variables in `wrangler.toml`.
  - Alternatively set them as secrets with `npx wrangler secret put <key>`.
- Publish the Worker with `npx wrangler publish`.
- Create a Telnyx messaging profile.
  - Set the webhook URL to the Worker's URL.
  - Assign the messaging profile to a phone number.
