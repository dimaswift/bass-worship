import { parseBar, youtubeInfo } from './song.js';

const app = document.getElementById('app');
const files = new Map();
const VIEWS = [
  ['tab', 'Bass tab'],
  ['chart', 'Chords & lyrics'],
];

let query = '';
let visit = 0;

// The string names are drawn at the start of each row of bars, and where a row starts
// depends on the width of the screen.
const rowWatcher = new ResizeObserver((entries) => {
  for (const entry of entries) markRowStarts(entry.target);
});

function markRowStarts(bars) {
  let top = null;
  for (const bar of bars.children) {
    bar.classList.toggle('row-start', bar.offsetTop !== top);
    top = bar.offsetTop;
  }
}

// Builds an element. Text always goes in as text, never as markup.
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (name.startsWith('on')) el.addEventListener(name.slice(2), value);
    else el.setAttribute(name, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false || child === '') continue;
    el.append(child);
  }
  return el;
}

function outLink(href, text) {
  return h('a', { href, target: '_blank', rel: 'noopener' }, text, h('span', { 'aria-hidden': 'true' }, ' ↗'));
}

async function getJSON(path) {
  if (!files.has(path)) {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    files.set(path, await response.json());
  }
  return files.get(path);
}

// Lower case, without accents, so that a search finds "е" for "ё".
function fold(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function readView() {
  try {
    const saved = localStorage.getItem('bass-worship.view');
    if (VIEWS.some(([key]) => key === saved)) return saved;
  } catch {}
  return 'tab';
}

function saveView(view) {
  try {
    localStorage.setItem('bass-worship.view', view);
  } catch {}
}

// The playing notes stay folded once the player has folded them.
function notesFolded() {
  try {
    return localStorage.getItem('bass-worship.notes') === 'folded';
  } catch {
    return false;
  }
}

function saveNotesFolded(folded) {
  try {
    localStorage.setItem('bass-worship.notes', folded ? 'folded' : 'open');
  } catch {}
}

// ---------------------------------------------------------------- the catalogue

async function showList(turn) {
  const songs = await getJSON('songs/index.json');
  if (turn !== visit) return;
  document.title = 'Bass Worship';

  const list = h('ul', { class: 'songs' });
  const status = h('p', { class: 'status', role: 'status' });
  const search = h('input', {
    class: 'search',
    type: 'search',
    placeholder: 'Search by title, artist or key',
    'aria-label': 'Search songs',
    autocomplete: 'off',
    oninput: () => {
      query = search.value;
      draw();
    },
  });
  search.value = query;

  function draw() {
    const wanted = fold(query.trim());
    const shown = songs.filter((song) => fold([song.title, song.subtitle, song.artist, song.key].join(' ')).includes(wanted));
    list.replaceChildren(...shown.map(songRow));
    if (songs.length === 0) status.textContent = 'No songs yet.';
    else if (shown.length === 0) status.textContent = `Nothing matches “${query.trim()}”.`;
    else if (wanted) status.textContent = `${shown.length} of ${songs.length}`;
    else status.textContent = songs.length === 1 ? '1 song' : `${songs.length} songs`;
  }

  draw();
  app.replaceChildren(h('h1', { class: 'page-title' }, 'Songs'), search, status, list);
}

function songRow(song) {
  const by = [song.subtitle, song.artist].filter(Boolean).join(' · ');
  return h('li', {},
    h('a', { class: 'song-row', href: `#/song/${song.id}` },
      h('span', { class: 'song-row-text' },
        h('span', { class: 'song-row-title' }, song.title),
        by && h('span', { class: 'song-row-by' }, by)),
      song.video && h('span', { class: 'has-video', title: 'Has a video' }, '▶'),
      h('span', { class: 'key' }, song.key)));
}

// ---------------------------------------------------------------- one song

async function showSong(id, turn) {
  const song = await getJSON(`songs/${id}.json`);
  if (turn !== visit) return;
  document.title = `${song.title} · Bass Worship`;

  const view = readView();
  const buttons = VIEWS.map(([key, label]) =>
    h('button', {
      type: 'button',
      'aria-pressed': String(key === view),
      onclick: () => {
        article.dataset.view = key;
        saveView(key);
        for (const [n, button] of buttons.entries()) button.setAttribute('aria-pressed', String(VIEWS[n][0] === key));
      },
    }, label));

  const by = [song.subtitle, song.artist].filter(Boolean).join(' · ');
  const tuning = song.tuning && song.tuning !== 'EADG' ? song.tuning : null;
  const video = youtubeInfo(song.youtube);
  const words = [song.title, song.subtitle, song.artist].filter(Boolean).join(' ');
  const lyricWords = /[а-яё]/i.test(song.title) ? 'текст аккорды' : 'lyrics chords';

  const article = h('article', { class: 'song', 'data-view': view },
    h('a', { class: 'back', href: '#/' }, h('span', { 'aria-hidden': 'true' }, '← '), 'Songs'),
    h('h1', { class: 'song-title' }, song.title),
    by && h('p', { class: 'song-by' }, by),
    h('ul', { class: 'facts' },
      h('li', {}, h('span', {}, 'Key'), song.key),
      song.bpm && h('li', {}, h('span', {}, 'BPM'), String(song.bpm)),
      h('li', {}, h('span', {}, 'Time'), song.time || '4/4'),
      tuning && h('li', {}, h('span', {}, 'Tuning'), tuning)),
    video && videoPlayer(video),
    h('p', { class: 'links' },
      video
        ? outLink(`https://www.youtube.com/watch?v=${video.id}`, 'Open in YouTube')
        : outLink(`https://www.youtube.com/results?search_query=${encodeURIComponent(words)}`, 'Find on YouTube'),
      /^https?:\/\//.test(song.source || '')
        ? outLink(song.source, 'Lyrics and chord sheet')
        : outLink(`https://www.google.com/search?q=${encodeURIComponent(`${words} ${lyricWords}`)}`, 'Search for lyrics')),
    h('div', { class: 'switch', role: 'group', 'aria-label': 'What to show' }, buttons),
    song.notes?.length > 0 &&
      h('details', { class: 'notes', open: !notesFolded(), ontoggle: (event) => saveNotesFolded(!event.target.open) },
        h('summary', {}, 'Playing notes'),
        h('ul', {}, song.notes.map((note) => h('li', {}, note)))),
    song.sections.map((section) => sectionBlock(section, song)));

  app.replaceChildren(article);
}

// The poster comes first; YouTube is loaded only when the song is played.
function videoPlayer(video) {
  const box = h('div', { class: 'video' });
  const start = video.start ? `&start=${video.start}` : '';
  box.append(
    h('button', {
      class: 'video-poster',
      type: 'button',
      'aria-label': 'Play the video',
      onclick: () => {
        box.replaceChildren(
          h('iframe', {
            src: `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&playsinline=1${start}`,
            title: 'YouTube video',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            referrerpolicy: 'strict-origin-when-cross-origin',
            allowfullscreen: true,
          }));
      },
    },
    h('img', { src: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`, alt: '', loading: 'lazy' }),
    h('span', { class: 'play', 'aria-hidden': 'true' })));
  return box;
}

function sectionBlock(section, song) {
  const chart = section.chart || [];
  const tabs = section.tabs || [];
  const missing = [chart.length === 0 && 'no-chart', tabs.length === 0 && 'no-tabs'].filter(Boolean).join(' ');
  return h('section', { class: `section ${missing}`.trim() },
    h('h2', {}, section.name),
    chart.length > 0 && h('div', { class: 'chart' }, chart.map(chartLine)),
    tabs.map((tab) => tabBlock(tab, song)));
}

// A chart line is written with each chord in brackets before the syllable it falls on:
// "[G]Amazing [C]grace". A line of chords alone is drawn as a row of chords.
function chartLine(line) {
  const parts = [];
  const firstChord = line.indexOf('[');
  const lead = firstChord === -1 ? line : line.slice(0, firstChord);
  if (lead) parts.push(['', lead]);
  for (const match of line.matchAll(/\[([^\]]+)\]([^\[]*)/g)) parts.push([match[1], match[2]]);

  const chordsOnly = parts.every(([, words]) => words.trim() === '');
  if (chordsOnly) {
    return h('p', { class: 'chart-line chords-only' }, parts.map(([chord]) => h('span', { class: 'chord' }, chord)));
  }
  return h('p', { class: 'chart-line' },
    parts.map(([chord, words]) =>
      h('span', { class: 'part' },
        h('span', { class: 'chord' }, chord || ' '),
        h('span', { class: 'words' }, words || ' '))));
}

function tabBlock(tab, song) {
  const bars = h('div', { class: 'bars' }, tab.bars.map((bar) => barBlock(bar, song)));
  rowWatcher.observe(bars);
  const repeated = tab.repeat > 1;
  return h('div', { class: 'tab' },
    (tab.label || repeated) &&
      h('p', { class: 'tab-head' },
        tab.label && h('span', { class: 'tab-label' }, tab.label),
        repeated && h('span', { class: 'repeat' }, `play ×${tab.repeat}`)),
    tab.note && h('p', { class: 'tab-note' }, tab.note),
    bars);
}

function barBlock(bar, song) {
  const { slots, rows, chords, counts } = parseBar(bar, song);
  return h('div', { class: slots > 8 ? 'bar wide' : 'bar', style: `--slots:${slots}` },
    h('div', { class: 'bar-chords' },
      chords.map((chord, n) => {
        const end = n + 1 < chords.length ? chords[n + 1].slot + 1 : -1;
        return h('span', { style: `grid-column:${chord.slot + 1} / ${end}` }, chord.name);
      })),
    h('div', { class: 'staff' },
      rows.map((row) =>
        h('div', { class: 'string', 'data-string': row.name },
          row.cells.map((fret, slot) => fret && h('span', { class: 'fret', style: `grid-column:${slot + 1}` }, fret))))),
    counts.length > 0 &&
      h('div', { class: 'bar-count', 'aria-hidden': 'true' },
        counts.map((count) => h('span', { class: /\d/.test(count) ? 'beat' : null }, count))));
}

// ---------------------------------------------------------------- which page

async function route() {
  const turn = ++visit;
  rowWatcher.disconnect();
  const song = /^#\/song\/([a-z0-9-]+)$/.exec(location.hash);
  try {
    if (song) await showSong(song[1], turn);
    else await showList(turn);
  } catch (error) {
    if (turn !== visit) return;
    console.error(error);
    app.replaceChildren(
      h('p', { class: 'status' }, song ? 'This song could not be loaded.' : 'The songs could not be loaded.'),
      song && h('a', { class: 'back', href: '#/' }, '← Songs'));
  }
  if (turn === visit) window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
