# **App Name**: Domain Seeker

## Core Features:

- Keyword Lists Input: Two separate text areas for entering lists of keywords.
- TLD Selection: A grid of checkboxes for selecting desired TLDs.
- Job Size Limit: Enforce a strict limit of 5,000 total domain checks per job. This check should happen on both the client and server side.
- Domain Availability Check: The Cloud Function securely calls the Dynadot API to check domain availability and retrieve the registration price for available domains.
- Real-time Results Display: Displays results in two real-time lists: available domains with their price and unavailable domains.

## Style Guidelines:

- A bold, edgy, and clean "tech SaaS" aesthetic, similar to Vercel or Linear.
- Background: A very dark gray or near-black (e.g., `#111827`).
- Primary Text: Off-white or a light gray (e.g., `#E5E7EB`).
- Accent Color: A vibrant, edgy purple for primary buttons, links, and the progress bar (e.g., `#8B5CF6`).
- Success/Available Color: A hot pink or magenta to highlight available domains, creating a unique look (e.g., `#EC4899`).
- Use the 'Inter' sans-serif font with a clean, modern typographic hierarchy.