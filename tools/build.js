#!/usr/bin/env node
// Checks every song in songs/ and writes the catalogue the page lists them from (songs/index.json).
// Run it after adding or changing a song: node tools/build.js
// When a song has a mistake it says which and where, and leaves the catalogue as it was.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSong, youtubeInfo } from '../assets/song.js';

const songsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'songs');
const names = readdirSync(songsDir).filter((name) => name.endsWith('.json') && name !== 'index.json').sort();

const catalogue = [];
let mistakes = 0;

for (const name of names) {
  const errors = [];
  let song = null;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*\.json$/.test(name)) {
    errors.push('the file name must be lower-case Latin letters, digits and hyphens, like nash-bog.json');
  }
  try {
    song = JSON.parse(readFileSync(join(songsDir, name), 'utf8'));
    errors.push(...validateSong(song));
  } catch (error) {
    errors.push(`not valid JSON: ${error.message}`);
  }
  for (const error of errors) console.error(`songs/${name}: ${error}`);
  mistakes += errors.length;
  if (errors.length === 0) {
    catalogue.push({
      id: name.replace(/\.json$/, ''),
      title: song.title,
      subtitle: song.subtitle || '',
      artist: song.artist || '',
      key: song.key,
      added: song.added || '',
      video: youtubeInfo(song.youtube) !== null,
    });
  }
}

if (mistakes > 0) {
  console.error(`\n${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'}; songs/index.json was not written.`);
  process.exit(1);
}

catalogue.sort((a, b) => a.title.localeCompare(b.title, ['ru', 'en'], { sensitivity: 'base' }));
writeFileSync(join(songsDir, 'index.json'), `${JSON.stringify(catalogue, null, 2)}\n`);
console.log(`${catalogue.length} ${catalogue.length === 1 ? 'song' : 'songs'} checked; songs/index.json written.`);
