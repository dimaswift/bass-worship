# Bass Worship

A catalogue of worship songs for a bass player: for each song the chords by section, a bass tab and a
YouTube link. It is a static site with no build step, served by GitHub Pages from the `main` branch at
https://dimaswift.github.io/bass-worship/. The repository is public.

| Path | What it is |
|---|---|
| `index.html`, `assets/app.js`, `assets/style.css` | The page: the catalogue at `#/`, one song at `#/song/<id>` |
| `assets/song.js` | How a song file is read and checked; shared by the page and the checker |
| `songs/<id>.json` | One song each |
| `songs/index.json` | The catalogue the page lists songs from. The checker writes it; never edit it by hand |
| `tools/build.js` | The checker: validates every song, then writes `songs/index.json` |

## Adding a song

The owner sends a screenshot of a chord chart or a link to one (so far always holychords.pro), sometimes
with a YouTube link, and expects the song to appear on the site. They asked for this on 2026-11-11 as the
standing way of adding songs, so the commit and the push are part of the job.

On a holychords.pro page the chart is the `#music_text` block: section names, lines of chords, lines of
words. Take the sections and chords from it and leave the words. The page also names the artist, sometimes
gives "BPM" and "Time Sig", and embeds a YouTube video of the song; check that video's title and use it as
`youtube` unless the owner gave another. The page's address is the song's `source`. A screenshot shows no
title: search for a line of the chart to find its page.

The owner is learning the bass and cannot answer questions about meter, bar lengths or tempo. Find these
out from the page or state what you assumed; do not ask.

1. Read the chart: the title, the key, the sections in order, the chords of each line. The charts are
   usually Russian and write H for B. Keep the chord names as the chart has them and put "H in the chords
   is B." in `notes`.
2. Work out the bars: which chords share a bar and how long each lasts. If you know the song, use its real
   bar structure. Where you are guessing, say so in that tab's `note`.
3. Write `songs/<id>.json` in the format below. The id is the title in lower-case Latin letters and
   hyphens, transliterated when the title is Russian: "Наш Бог" is `nash-bog`.
4. Run `node tools/build.js` and fix what it reports until it writes the catalogue.
5. Look at the song in a browser at phone width: `python3 -m http.server 4173`, then
   `http://localhost:4173/#/song/<id>`.
6. Commit the song with `songs/index.json` and push to `main`. The push publishes it; the site follows in
   about a minute.
7. Tell the owner what you assumed (bar lengths, tempo, the original title) so they can correct it.

To add or change a YouTube link, put the link as given in the song's `youtube` field, run the checker (the
catalogue records which songs have a video), commit and push.

## Lyrics

Do not copy lyrics from a screenshot into a song file: the site is public and the songs are under
copyright. Chart lines hold chords only, and the song page links to the chord sheet (`source`) or to a
search for the words. Words go in only for a song in the public domain (an old hymn in its original
text) or one the owner wrote.

## The song file

```json
{
  "title": "Наш Бог",
  "subtitle": "Our God",
  "artist": "Chris Tomlin",
  "key": "G#m",
  "bpm": 105,
  "time": "4/4",
  "tuning": "EADG",
  "youtube": "",
  "source": "",
  "added": "2026-11-11",
  "notes": ["H in the chords is B."],
  "sections": [
    {
      "name": "Куплет",
      "chart": ["[G#m] [E] [H]", "[C#m] [F#]"],
      "tabs": [
        {
          "label": "",
          "note": "C#m and F# are two bars each here.",
          "repeat": 2,
          "bars": [
            { "chords": [[1, "G#m"], [3, "E"]], "E": "4-----4-0-----0-" },
            { "chords": "H", "A": "2-----2-2-------" }
          ]
        }
      ]
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `title`, `key` | Required. The key as the chart writes it |
| `subtitle` | The original title when the song is a translation |
| `time` | `4/4` when left out; any count of quarter or eighth notes (`3/4`, `6/8`) |
| `tuning` | `EADG` when left out; the lowest string first, each letter once (`BEADG` for five strings) |
| `youtube` | Any YouTube link; a start time in it (`?t=90`) is kept |
| `source` | The address of the chord sheet the screenshot came from, when known |
| `added` | The day the song was added, `YYYY-MM-DD` |
| `notes` | Sentences shown as "Playing notes" above the tab |
| `sections` | In the order they are played. `name` as the chart has it, in its language |

A **chart line** has each chord in square brackets: `"[G#m] [E] [H]"`. With words, the bracket goes before
the syllable the chord falls on: `"[G]Amazing [C]grace"`.

A **tab** is one way of playing a section. A section can have several (the bridge of `nash-bog` has a
quiet one, a build and a loud one), each with a `label`. `repeat` is how many times the bars are played.

A **bar** has `chords` and one line for each string that has notes:

- `chords` is a name (`"H"`, on beat 1) or a list of beat and name (`[[1, "G#m"], [3, "E"]]`). Leave it out
  when the chord carries over from the bar before.
- A string line is two characters to a slot. A note starts at the first character of its slot (`4-`, `12`);
  `--` is an empty slot. Strings without notes are left out.
- The length of the line sets the grid. In 4/4: 16 characters are eighth notes, 32 are sixteenth notes,
  8 are quarter notes, 24 are triplets. Every line of a bar has the same length.
- A long note is written once, where it starts.
- Besides fret numbers: `x` a dead note, `h` hammer-on, `p` pull-off, `/` and `\` slides, `~` vibrato,
  written after the fret they belong to (`4h` then `6-`).
- Prefer eighth-note bars: two of them fit side by side on a phone, a finer bar takes the whole width.

## Writing the bass line

The owner plays a four-string bass in standard tuning and is a beginner (2026-11-11). The tabs are
arrangements made from the chords, not transcriptions, and `notes` says so.

- Write for a learner: whole, half and quarter notes on the quarter-note grid (8 characters in 4/4, counted
  1 2 3 4), notes on the beat. Anything with eighth notes or off-beat notes goes in a second tab of the
  section labelled as the harder one. `zhit-v-tvoey-realnosti` is the model.
- In `notes`, say which finger goes on which fret, and give the order of the sections when the chart lists
  the whole song. Explain in plain words; no theory terms without saying what they mean.

- The root of the chord on the downbeat. For a slash chord (`C/E`) the bass plays the note after the slash.
- One hand position where the song allows it, low on the neck. Give the fret of each root in `notes`, and
  an alternative where an open string may sound too loose.
- Let the line grow with the song: one long note per bar where it is quiet, two in the pre-chorus, a note on
  every count in the chorus. Nothing faster than eighth notes unless the song asks for it.

## Changing the page

There are no dependencies and nothing to compile; what is in the repository is what is served. Check a
change at phone width (375 px) and on a wide screen, in light and in dark, before pushing. Text from a song
file always goes into the page as text, never as markup.
