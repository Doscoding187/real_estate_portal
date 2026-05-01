# Listify Color System

Listify uses a layered color system so trust surfaces and conversion actions do different jobs.

- Blue (`--brand-blue`, `--primary`) is for trust, navigation, structure, dashboards, selected states, links, and system actions.
- Orange (`--conversion`) is for funnel-driving actions: submit buyer, submit referral, get matched, contact, WhatsApp, advertise, join network, lead capture, and booking actions that create a lead.
- Slate, white, and `--surface` are neutral product surfaces.
- Success, warning, danger, and info tokens communicate marketplace and workflow states.

Default buttons stay blue for system actions. Use `Button variant="conversion"` only for high-intent conversion actions.
