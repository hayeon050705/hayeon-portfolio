/**
 * Data-access layer for the portfolio content.
 *
 * Everything here reads from local JSON files today. When a real database
 * is connected later, only the bodies of these three functions need to
 * change (e.g. to SQL/ORM queries) — the API routes in /api and the
 * frontend that calls them stay the same.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function getProfile() {
  return readJSON('profile.json');
}

async function getProjects() {
  return readJSON('projects.json');
}

async function getAwards() {
  return readJSON('awards.json');
}

module.exports = { getProfile, getProjects, getAwards };
