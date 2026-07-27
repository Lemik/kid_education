/**
 * Apply new settings without a full page reload.
 * Updates the URL for bookmarking/sharing and clears the session score/timer.
 */
export function commitSettingsChange(nextSettings, settingsToUrl, resetSession) {
  resetSession();
  history.replaceState(null, '', settingsToUrl(nextSettings));
}
