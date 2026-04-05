export function parseM3U(content) {
  const lines = content.split(/\r?\n/);
  const channels = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF:")) {
      current = {};
      // Parse attributes
      const attrMatch = line.match(/#EXTINF:[^,]*,(.*)/);
      current.name = attrMatch ? attrMatch[1].trim() : "Unknown";

      // tvg-name
      const tvgName = line.match(/tvg-name="([^"]*)"/);
      if (tvgName) current.tvgName = tvgName[1];

      // tvg-logo
      const logo = line.match(/tvg-logo="([^"]*)"/);
      if (logo) current.logo = logo[1];

      // tvg-id
      const id = line.match(/tvg-id="([^"]*)"/);
      if (id) current.tvgId = id[1];

      // group-title
      const group = line.match(/group-title="([^"]*)"/);
      current.group = group ? group[1] : "Uncategorized";

    } else if (line.startsWith("#")) {
      continue;
    } else if (current) {
      current.url = line;
      current.id = channels.length;
      channels.push(current);
      current = null;
    }
  }

  // Extract unique groups
  const groups = [...new Set(channels.map(c => c.group))].sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });

  return { channels, groups };
}
