# Bass Worship

Bass tabs and chord charts for worship songs: https://dimaswift.github.io/bass-worship/

Each song has its chords by section, a bass tab that fits a phone screen, and a YouTube link. The tabs
are root-note arrangements made from chord charts, not transcriptions of recordings.

A song is one file in `songs/`. After adding or changing one:

```bash
node tools/build.js
```

This checks every song and rewrites the catalogue (`songs/index.json`). To see the site locally:

```bash
python3 -m http.server 4173
```

The format of a song file and the way songs are added are described in [CLAUDE.md](CLAUDE.md).
