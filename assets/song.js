// How a song file is read. Shared by the page (assets/app.js) and the checker (tools/build.js),
// so that a song the checker accepts is a song the page can draw.

export const DEFAULT_TUNING = 'EADG';
export const DEFAULT_TIME = '4/4';

// What is counted between two beats, by the number of slots a beat has.
const SUBDIVISIONS = { 1: [], 2: ['&'], 3: ['&', 'a'], 4: ['e', '&', 'a'] };

export function timeOf(song) {
  const match = /^(\d+)\/(\d+)$/.exec(song.time || DEFAULT_TIME);
  return { beats: Number(match[1]), unit: Number(match[2]) };
}

// The strings from the highest to the lowest: the order a tab is drawn in.
export function stringsOf(song) {
  return [...(song.tuning || DEFAULT_TUNING)].reverse();
}

// A bar is written two characters to a slot. With no string written (a bar of rest) it takes
// the eighth-note grid of the song's time signature.
export function barLength(bar, song) {
  for (const name of stringsOf(song)) {
    if (typeof bar[name] === 'string') return bar[name].length;
  }
  const { beats, unit } = timeOf(song);
  return unit === 8 ? beats * 2 : beats * 4;
}

// "G#m" is a chord on beat 1; [[1, "G#m"], [3, "E"]] places each chord on its beat.
function chordsOf(bar) {
  if (typeof bar.chords === 'string') return [[1, bar.chords]];
  return Array.isArray(bar.chords) ? bar.chords : [];
}

export function parseBar(bar, song) {
  const length = barLength(bar, song);
  const slots = length / 2;
  const { beats } = timeOf(song);
  const rows = stringsOf(song).map((name) => {
    const line = bar[name] || '';
    const cells = [];
    for (let slot = 0; slot < slots; slot++) {
      cells.push(line.slice(slot * 2, slot * 2 + 2).replace(/-/g, ''));
    }
    return { name, cells };
  });
  const chords = chordsOf(bar).map(([beat, name]) => ({
    name,
    slot: Math.min(slots - 1, Math.round(((beat - 1) * slots) / beats)),
  }));
  const between = SUBDIVISIONS[slots / beats];
  const counts = [];
  if (between) {
    for (let beat = 1; beat <= beats; beat++) counts.push(String(beat), ...between);
  }
  return { slots, rows, chords, counts };
}

// The video id and the start second of a YouTube link, or null when it is not one.
export function youtubeInfo(url) {
  if (typeof url !== 'string' || url.trim() === '') return null;
  let link;
  try {
    link = new URL(url.trim());
  } catch {
    return null;
  }
  const host = link.hostname.replace(/^(www|m|music)\./, '');
  let id = '';
  if (host === 'youtu.be') {
    id = link.pathname.split('/')[1] || '';
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (link.pathname === '/watch') {
      id = link.searchParams.get('v') || '';
    } else {
      const match = /^\/(embed|shorts|live|v)\/([^/]+)/.exec(link.pathname);
      if (match) id = match[2];
    }
  }
  if (!/^[\w-]{11}$/.test(id)) return null;
  return { id, start: seconds(link.searchParams.get('t') || link.searchParams.get('start')) };
}

// "90", "90s" and "1m30s" are all ninety seconds.
function seconds(text) {
  if (!text) return 0;
  if (/^\d+$/.test(text)) return Number(text);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(text);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

// Every reason a song file cannot be published, in words; an empty list means it can.
export function validateSong(song) {
  if (!song || typeof song !== 'object' || Array.isArray(song)) return ['the file is not a JSON object'];
  const errors = [];
  const isText = (value) => typeof value === 'string' && value.trim() !== '';

  if (!isText(song.title)) errors.push('title is missing');
  if (!isText(song.key)) errors.push('key is missing');
  for (const field of ['subtitle', 'artist', 'youtube', 'source', 'added']) {
    if (song[field] != null && typeof song[field] !== 'string') errors.push(`${field} must be text`);
  }
  if (song.bpm != null && !(Number.isFinite(song.bpm) && song.bpm > 0)) errors.push('bpm must be a number');
  if (isText(song.youtube) && !youtubeInfo(song.youtube)) errors.push(`youtube "${song.youtube}" is not a YouTube link`);
  if (isText(song.source) && !/^https?:\/\/\S+$/.test(song.source)) errors.push(`source "${song.source}" is not a web address`);
  if (isText(song.added) && !/^\d{4}-\d{2}-\d{2}$/.test(song.added)) errors.push(`added "${song.added}" is not a date like 2026-11-11`);
  if (song.notes != null && !(Array.isArray(song.notes) && song.notes.every(isText))) errors.push('notes must be a list of sentences');

  const time = song.time ?? DEFAULT_TIME;
  const timeOk = typeof time === 'string' && /^[1-9]\d?\/(4|8)$/.test(time);
  if (!timeOk) errors.push(`time "${time}" is not like 4/4 or 6/8`);
  const tuning = song.tuning ?? DEFAULT_TUNING;
  const tuningOk = typeof tuning === 'string' && /^[A-G]{4,6}$/.test(tuning) && new Set(tuning).size === tuning.length;
  if (!tuningOk) errors.push(`tuning "${tuning}" must name each string once, lowest first, like EADG or BEADG`);

  if (!Array.isArray(song.sections) || song.sections.length === 0) {
    errors.push('sections is missing or empty');
    return errors;
  }
  song.sections.forEach((section, at) => {
    const where = isText(section?.name) ? section.name : `section ${at + 1}`;
    if (!section || typeof section !== 'object') return errors.push(`${where}: must be an object`);
    if (!isText(section.name)) errors.push(`${where}: name is missing`);
    const chart = section.chart ?? [];
    const tabs = section.tabs ?? [];
    if (!Array.isArray(chart) || !chart.every((line) => typeof line === 'string')) {
      errors.push(`${where}: chart must be a list of lines`);
    } else {
      chart.forEach((line, n) => {
        if (/\[[^\]]*(\[|$)|\[\]/.test(line) || /^[^\[]*\]/.test(line)) errors.push(`${where}: chart line ${n + 1} has a chord bracket that is not closed or is empty`);
      });
    }
    if (!Array.isArray(tabs)) return errors.push(`${where}: tabs must be a list`);
    if (chart.length === 0 && tabs.length === 0) errors.push(`${where}: has neither chart nor tabs`);
    tabs.forEach((tab, n) => {
      const tabWhere = `${where}, tab ${n + 1}`;
      if (!tab || typeof tab !== 'object') return errors.push(`${tabWhere}: must be an object`);
      for (const field of ['label', 'note']) {
        if (tab[field] != null && typeof tab[field] !== 'string') errors.push(`${tabWhere}: ${field} must be text`);
      }
      if (tab.repeat != null && !(Number.isInteger(tab.repeat) && tab.repeat >= 1)) errors.push(`${tabWhere}: repeat must be a whole number`);
      if (!Array.isArray(tab.bars) || tab.bars.length === 0) return errors.push(`${tabWhere}: bars is missing or empty`);
      if (!timeOk || !tuningOk) return;
      tab.bars.forEach((bar, b) => checkBar(bar, song, `${tabWhere}, bar ${b + 1}`, errors));
    });
  });
  return errors;
}

function checkBar(bar, song, where, errors) {
  if (!bar || typeof bar !== 'object' || Array.isArray(bar)) return errors.push(`${where}: must be an object`);
  const strings = stringsOf(song);
  const { beats } = timeOf(song);
  for (const key of Object.keys(bar)) {
    if (key !== 'chords' && !strings.includes(key)) errors.push(`${where}: "${key}" is not a string of this tuning`);
  }
  const written = strings.filter((name) => bar[name] != null);
  const length = barLength(bar, song);
  for (const name of written) {
    const line = bar[name];
    if (typeof line !== 'string') {
      errors.push(`${where}: string ${name} must be text`);
      continue;
    }
    if (line.length !== length) errors.push(`${where}: string ${name} is ${line.length} characters, string ${written[0]} is ${length}`);
    if (!/^[0-9xhp/\\~-]*$/.test(line)) errors.push(`${where}: string ${name} has a character a tab does not use`);
    for (let i = 0; i + 1 < line.length; i += 2) {
      if (line[i] === '-' && line[i + 1] !== '-') {
        errors.push(`${where}: string ${name}, slot ${i / 2 + 1} starts with "-"; a note starts at the first of a slot's two characters`);
      }
    }
  }
  const slots = length / 2;
  if (!SUBDIVISIONS[slots / beats]) {
    const fits = Object.keys(SUBDIVISIONS).map((per) => per * beats * 2).join(', ');
    errors.push(`${where}: ${length} characters do not divide into ${beats} beats; use ${fits}`);
  }
  const chords = bar.chords;
  if (chords == null || typeof chords === 'string') return;
  const pairs = Array.isArray(chords) && chords.every((c) => Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'string' && c[1] !== '');
  if (!pairs) return errors.push(`${where}: chords must be a name or a list like [[1, "G#m"], [3, "E"]]`);
  chords.forEach(([beat], n) => {
    if (beat < 1 || beat >= beats + 1) errors.push(`${where}: chord on beat ${beat}, the bar has beats 1 to ${beats}`);
    if (n > 0 && beat <= chords[n - 1][0]) errors.push(`${where}: chords must be in the order they are played`);
  });
}
