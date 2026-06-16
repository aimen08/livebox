// Parse an M3U / M3U-plus playlist into the same shape the Xtream loader
// produces: live channels, movies, and series (grouped into seasons/episodes).
//
// Classification is by URL path — Xtream-exported `m3u_plus` playlists tag VOD
// with `/movie/` and series with `/series/`; everything else is live TV. A plain
// live-only M3U therefore loads entirely as channels (the common case).

const SORT_GROUPS = (a, b) => {
  if (a === "Uncategorized") return 1;
  if (b === "Uncategorized") return -1;
  return a.localeCompare(b);
};

// "Title S01 E02", "Title S01E02", "Title 1x02" → { title, season, episodeNum }
function parseEpisode(name) {
  let m = name.match(/^(.*?)[\s._-]*S(\d{1,2})\s*[\s._-]*E(\d{1,3})/i);
  if (m) return { title: m[1].replace(/[\s._-]+$/, "").trim(), season: +m[2], episodeNum: +m[3] };
  m = name.match(/^(.*?)[\s._-]+(\d{1,2})x(\d{1,3})/i);
  if (m) return { title: m[1].replace(/[\s._-]+$/, "").trim(), season: +m[2], episodeNum: +m[3] };
  return null;
}

export function parseM3U(content) {
  const lines = content.split(/\r?\n/);
  const channels = [];
  const movies = [];
  const seriesMap = new Map(); // seriesId(title) → series object
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF:")) {
      current = {};
      const attrMatch = line.match(/#EXTINF:[^,]*,(.*)/);
      current.name = attrMatch ? attrMatch[1].trim() : "Unknown";
      const tvgName = line.match(/tvg-name="([^"]*)"/);
      if (tvgName) current.tvgName = tvgName[1];
      const logo = line.match(/tvg-logo="([^"]*)"/);
      if (logo) current.logo = logo[1];
      const id = line.match(/tvg-id="([^"]*)"/);
      if (id) current.tvgId = id[1];
      const group = line.match(/group-title="([^"]*)"/);
      current.group = group ? group[1] : "Uncategorized";
    } else if (line.startsWith("#")) {
      continue;
    } else if (current) {
      current.url = line;
      const url = line.toLowerCase();

      if (url.includes("/movie/")) {
        movies.push({ id: "m" + movies.length, name: current.name, url: line, poster: current.logo || "", group: current.group });
      } else if (url.includes("/series/")) {
        const ep = parseEpisode(current.name);
        const title = ep ? ep.title || current.name : current.name;
        const seriesId = "s:" + title;
        let s = seriesMap.get(seriesId);
        if (!s) {
          s = { seriesId, name: title, poster: current.logo || "", group: current.group, episodes: [] };
          seriesMap.set(seriesId, s);
        }
        if (!s.poster && current.logo) s.poster = current.logo;
        s.episodes.push({
          name: current.name,
          url: line,
          poster: current.logo || "",
          season: ep ? ep.season : 1,
          episodeNum: ep ? ep.episodeNum : s.episodes.length + 1,
        });
      } else {
        current.id = channels.length;
        channels.push(current);
      }
      current = null;
    }
  }

  for (const s of seriesMap.values()) {
    s.episodes.sort((a, b) => a.season - b.season || a.episodeNum - b.episodeNum);
  }
  const series = [...seriesMap.values()];

  const uniq = (arr) => [...new Set(arr.map((x) => x.group))].sort(SORT_GROUPS);
  return {
    channels,
    groups: uniq(channels),
    movies,
    movieGroups: uniq(movies),
    series,
    seriesGroups: uniq(series),
  };
}
