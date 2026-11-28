# Protlys Hub functional audit

This is the acceptance checklist for the Hub-wide functionality pass. Items are not considered complete because a screen renders; each must be exercised end-to-end on the production-like web build and the Android app.

## Release rules

- Work one feature slice at a time on a dedicated branch.
- Trace each action from UI through client/server code, Supabase and back to visible feedback.
- Run `npm test`, `npm run build`, and relevant Playwright tests for each web slice.
- For Android changes, run the Gradle release build and test on a physical device.
- Do not deploy or publish an AAB until the relevant checks pass.
- Keep the current Protlys palette, typography, layout patterns and Android safe-area behaviour.
- Keep the blog in its explicitly intended Coming Soon state.
- Do not add Health Connect, a foreground service, or persistent notification without reconciling the product decision with the owner first.

## Audit matrix

| Area | Required behaviour | Verification |
|---|---|---|
| Feed | Load posts, profiles, images, pagination, likes, comments, replies, edit/delete permissions, report/block behaviour | Signed-in and signed-out flows; empty/error/offline states; two-user visibility |
| Post share cards | Render preview, switch themes, save image, share image with public post URL, copy post link | Android physical device and mobile browser; verify actual saved file and received share payload |
| Movement | Read Android hardware steps, avoid false positives from handling/shaking/transport, preserve slow walking, sync correctly, recover after reboot/network loss, handle midnight in Africa/Nairobi | Controlled walk, run, stationary phone, hand shake, phone carried in vehicle, permission denied, offline/online, day rollover |
| Challenges | Create/edit/join/leave challenges, invite links, progress, ranking, group membership and privacy | Owner/member/non-member/admin accounts; expired/invalid invite; empty and error states |
| Groups | Create/join/leave, group messages, unread counts, image messages, member lists, block rules | Two or more accounts; permissions and message visibility |
| Protein | Set target, add/edit/delete intake, calculate totals, handle day boundaries, show correct progress | Multiple entries, invalid values, target changes, timezone boundary |
| Dashboard | Load real daily/weekly totals, movement history, protein progress and streaks | Compare rendered values to source rows and API/RPC responses; never accept hardcoded zero placeholders |
| Profiles | Edit profile, avatar, member details, follow/block/report where available, share profile | Owner and other-member views; privacy settings |
| Settings and account | Theme, notification preferences, privacy controls, sign out, account deletion | Confirm each action persists and gives accurate feedback |
| Navigation | Every tab, menu item, deep link, back action and external link resolves correctly | Small Android viewport, browser refresh, direct URL and logged-out state |
| Events and invitations | Open, RSVP or join where supported, share event and invitation links | Valid/invalid links; native share and browser fallback |
| Blog/library | Remain intentionally Coming Soon until the content source is enabled | No dead-end links or misleading enabled controls |
| Accessibility and resilience | Keyboard/screen-reader labels, contrast, loading feedback, retry paths, offline handling | Automated checks plus manual mobile review |

## Movement accuracy acceptance

The Android step counter and detector are hardware signals, not a guarantee of perfect classification. A candidate filter must be evaluated against both false positives and false negatives before release.

Minimum test scenarios:
1. Normal walking with phone in hand and in pocket.
2. Slow walking and short walks.
3. Running.
4. Stationary phone being shaken or moved by hand.
5. Phone carried in a moving vehicle.
6. Phone placed on a moving surface.
7. Sensor unavailable or permission denied.
8. App restart, device reboot, network interruption and midnight rollover.

Do not use a fixed cadence threshold that silently discards slow walkers. Do not infer steps from accelerometer magnitude alone. Compare accepted events with the hardware step counter and record test observations before changing production thresholds.

## Current known work

- [ ] Audit the Android step filter against the controlled scenarios above.
- [ ] Verify dashboard data loading and remove any final-state placeholder values.
- [ ] Verify Feed data hydration and all post actions.
- [ ] Repair and verify post-card save/share/link copy on Android and browser.
- [ ] Exercise challenge and group creation/join/progress/message flows.
- [ ] Exercise protein logging, targets and daily totals.
- [ ] Exercise profile, settings, account and navigation flows.
- [ ] Run the complete web test/build suite and Android release build.
- [ ] Complete phone-visible acceptance testing before production rollout.

## Reporting format

For every feature, record:
- observed behaviour and reproduction steps;
- root cause and files changed;
- tests run and their actual results;
- any manual device test still outstanding;
- deployment or release status.

Use explicit statuses: Not started, Investigating, Fix in review, Verified on web, Verified on Android, Released. Never mark an item verified based on code inspection alone.
