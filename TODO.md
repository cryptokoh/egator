# AIeGator / FlowB - TODO

## Done
- [x] Web gamification system (PointsProvider, PointsPopup, PointsBadge)
- [x] Points wired into mood chips (+1), filters (+1), event cards (+2)
- [x] Points persist in localStorage, toast animation in bottom-right
- [x] Theme documented in THEMES.md
- [x] FlowB restructured: core agent + plugin architecture
- [x] DANZ extracted into FlowB plugin (plugins/danz/)
- [x] eGator plugin created for aggregated event discovery (plugins/egator/)
- [x] Old monolithic danz.ts removed, TypeScript compiles clean

## FlowB Agent
- [ ] Test plugin system end-to-end with real DANZ Supabase creds
- [ ] Persist verified users to DB (currently in-memory Map, lost on restart)
- [ ] Improve event dedup (currently exact title match only)
- [ ] Add privacy layer to core (data handling, user consent, opt-out)
- [ ] Add Harmonik plugin stub
- [ ] Add more plugin hooks (onUserJoin, onEventBooked, etc.)
- [ ] FlowB personality/tone system for consistent voice across plugins

## eGator Plugin
- [ ] Wire AIeGator API server.ts to include DANZ adapter in discovery
- [ ] Add Luma, Eventbrite adapters to server.ts discover endpoint
- [ ] eGator search action needs query param support (not just city/category)

## Web App (apps/web)
- [ ] Connect web frontend to live API (currently uses hardcoded demo data)
- [ ] Add more gamification actions: search (+3), set location (+2), share event (+5)
- [ ] Add level system (points thresholds with titles)
- [ ] Add streak tracking (daily visits)
- [ ] Event detail page (clicking a card currently just logs)
- [ ] Search page with semantic search
- [ ] Mobile responsive testing

## Infrastructure
- [ ] Docker compose for local dev (postgres, redis, api)
- [ ] Environment variable template (.env.example)
- [ ] CI/CD for FlowB plugin build
