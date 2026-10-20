import { rememberFormSelections } from './profile.js';

/**
 * Apply new settings without a full page reload.
 * Saves shared choices (timer, results, answer mode) on the profile,
 * updates the URL for bookmarking, and clears the session score/timer.
 */
export function commitSettingsChange(nextSettings, settingsToUrl, resetSession) {
  rememberFormSelections(document.getElementById('settingsForm'));
  resetSession();
  history.replaceState(null, '', settingsToUrl(nextSettings));
}
