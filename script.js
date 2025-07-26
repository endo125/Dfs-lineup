let projections = [];
let locked = new Set();
let banned = new Set();
const salaryCap = 50000;
const maxFighters = 6;

async function loadProjections() {
  const res = await fetch('MMA_projections.json');
  projections = await res.json();
  renderFighters();
}

function renderFighters() {
  const tbody = document.getElementById('fighters-body');
  tbody.innerHTML = '';

  projections.forEach(f => {
    const row = document.createElement('tr');
    row.className = locked.has(f.name) ? 'locked' : banned.has(f.name) ? 'banned' : '';

    row.innerHTML = `
      <td>${f.name}</td>
      <td>$${f.salary}</td>
      <td>${f.projection}</td>
      <td><input type="checkbox" onchange="toggleLock('${f.name}')" ${locked.has(f.name) ? 'checked' : ''}></td>
      <td><input type="checkbox" onchange="toggleBan('${f.name}')" ${banned.has(f.name) ? 'checked' : ''}></td>
    `;
    tbody.appendChild(row);
  });
}

function toggleLock(name) {
  locked.has(name) ? locked.delete(name) : locked.add(name);
  renderFighters();
}

function toggleBan(name) {
  banned.has(name) ? banned.delete(name) : banned.add(name);
  renderFighters();
}

function generateLineups() {
  const valid = projections.filter(f => !banned.has(f.name));
  const combos = getCombinations(valid, maxFighters);
  const lineups = combos
    .map(team => ({
      team,
      totalSalary: team.reduce((sum, f) => sum + f.salary, 0),
      totalPoints: team.reduce((sum, f) => sum + f.projection, 0)
    }))
    .filter(l => l.totalSalary <= salaryCap && lockedIsIncluded(l.team))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10);

  const json = JSON.stringify(lineups, null, 2);
  downloadFile(json, 'lineups.json', 'application/json');
}

function lockedIsIncluded(team) {
  return [...locked].every(name => team.some(f => f.name === name));
}

function getCombinations(arr, k) {
  const result = [];
  function helper(path, start) {
    if (path.length === k) {
      result.push(path);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      helper([...path, arr[i]], i + 1);
    }
  }
  helper([], 0);
  return result;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function clearRules() {
  locked.clear();
  banned.clear();
  renderFighters();
}

function downloadCSV() {
  const headers = ['Fighter 1', 'Fighter 2', 'Fighter 3', 'Fighter 4', 'Fighter 5', 'Fighter 6', 'Total Salary', 'Total Points'];
  const combos = getCombinations(projections.filter(f => !banned.has(f.name)), maxFighters);
  const lineups = combos
    .map(team => ({
      names: team.map(f => f.name),
      salary: team.reduce((sum, f) => sum + f.salary, 0),
      points: team.reduce((sum, f) => sum + f.projection, 0)
    }))
    .filter(l => l.salary <= salaryCap && lockedIsIncluded(l.names.map(name => ({ name }))))
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  const rows = lineups.map(l => [...l.names, l.salary, l.points]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csv, 'lineups_upload.csv', 'text/csv');
}
document.getElementById('debug-message').textContent = 'Script loaded and projection fetch started';
loadProjections();
