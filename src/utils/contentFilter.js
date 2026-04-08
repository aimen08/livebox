// Adult/NSFW group filter. Tuned to catch obvious markers without
// trapping false positives like "Adult Swim" or "Adult Animation"
// (animation programming blocks, not pornography).

const ADULT_PATTERNS = [
  /for adults?/i,            // "FOR ADULTS"
  /^\s*adults?\s*$/i,        // standalone "ADULTS"
  /\b18\s*\+/,               // "18+"
  /\+\s*18\b/,               // "+18"
  /\bxxx\b/i,
  /\bporn/i,
  /\bnsfw\b/i,
  /\bhentai\b/i,
  /\berotic/i,
  /\badult\s+(content|only|movies?|tv|channels?|videos?)/i,
];

export function isAdultGroup(name) {
  if (!name) return false;
  return ADULT_PATTERNS.some((p) => p.test(name));
}

// Drop adult groups from a (items, groups) pair. Items are filtered by
// their `group` field; groups are pruned from the sidebar list.
function stripAdult(items, groups) {
  const blocked = new Set((groups || []).filter(isAdultGroup));
  if (!blocked.size) return { items: items || [], groups: groups || [] };
  return {
    items: (items || []).filter((it) => !blocked.has(it.group)),
    groups: (groups || []).filter((g) => !blocked.has(g)),
  };
}

// Apply the filter to a full Xtream catalog object (the shape we cache
// in IDB and what loadXtreamAPI builds before setState).
export function filterAdultCatalog(catalog) {
  if (!catalog) return catalog;
  const live = stripAdult(catalog.channels, catalog.groups);
  const mov = stripAdult(catalog.movies, catalog.movieGroups);
  const ser = stripAdult(catalog.series, catalog.seriesGroups);
  return {
    ...catalog,
    channels: live.items, groups: live.groups,
    movies: mov.items, movieGroups: mov.groups,
    series: ser.items, seriesGroups: ser.groups,
  };
}
