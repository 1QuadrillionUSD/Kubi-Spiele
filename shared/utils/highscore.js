const PREFIX = "meine-spiele:highscore:";

export function loadHighscore(gameId) {
  try {
    const value = Number(localStorage.getItem(PREFIX + gameId));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function saveHighscore(gameId, score) {
  const current = loadHighscore(gameId);
  const next = Math.max(current, score);
  try {
    localStorage.setItem(PREFIX + gameId, String(next));
  } catch {
    return next;
  }
  return next;
}
