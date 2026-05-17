# Agent Valley Sprite Reference

This folder contains deterministic base-reference sprite sheets for the current Pixi prototype.

## Files

- `agent-animations-sheet.svg`: transparent production-style character sheet.
- `agent-animations-contact-sheet.svg`: labeled character animation reference.
- `environment-props-sheet.svg`: transparent production-style environment prop sheet.
- `environment-reference.svg`: labeled environment prop and tile reference.
- `index.html`: browser preview page served by Vite at `/sprites/reference/`.

## Character Sheet

- Cell size: `48 x 64`
- Columns: 4 animation frames
- Rows:
  1. walk down
  2. walk side
  3. typing at computer
  4. working on whiteboard
  5. having a meeting
  6. playing in game room
  7. eating in kitchen
  8. ready / presenting

## Environment Sheet

- Prop cell size: `64 x 64`
- Tile palette target: `16 x 16` tiles
- Current prop set: desks, chairs, whiteboards, conference table, kitchen counter, cafe table, arcade cabinet, bookshelf, plant, water cooler, couch, coffee table, laptop, file stack, notice board, rug.

Regenerate with:

```bash
bun --filter @agent-valley/web sprites:reference
```
