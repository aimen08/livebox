import Foundation

enum XtreamError: Error {
    case badResponse
    case notJSON
}

// Xtream providers are inconsistent: category_id sometimes int, stream_id
// sometimes string, rating sometimes number. Decode leniently so a few
// malformed rows don't tank the whole catalog.
struct FlexibleString: Decodable {
    let value: String
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let s = try? c.decode(String.self) { value = s; return }
        if let i = try? c.decode(Int.self) { value = String(i); return }
        if let d = try? c.decode(Double.self) { value = String(d); return }
        value = ""
    }
}

struct XtreamClient {
    let creds: XtreamCreds

    func fetchCatalog() async throws -> Catalog {
        async let liveCats: [RawCategory] = callList("get_live_categories")
        async let liveStreamsRaw: [RawLiveStream] = callList("get_live_streams")
        async let vodCats: [RawCategory] = callList("get_vod_categories")
        async let vodStreamsRaw: [RawVodStream] = callList("get_vod_streams")
        async let serCats: [RawCategory] = callList("get_series_categories")
        async let serStreamsRaw: [RawSeries] = callList("get_series")

        let (lc, ls, vc, vs, sc, ss) = try await (liveCats, liveStreamsRaw, vodCats, vodStreamsRaw, serCats, serStreamsRaw)

        let liveCatMap = Dictionary(uniqueKeysWithValues: lc.map { ($0.category_id.value, $0.category_name) })
        let vodCatMap = Dictionary(uniqueKeysWithValues: vc.map { ($0.category_id.value, $0.category_name) })
        let serCatMap = Dictionary(uniqueKeysWithValues: sc.map { ($0.category_id.value, $0.category_name) })

        let channels: [Channel] = ls.enumerated().compactMap { idx, s in
            let urlStr = "\(creds.baseUrl)/live/\(creds.username)/\(creds.password)/\(s.stream_id.value).m3u8"
            guard let url = URL(string: urlStr) else { return nil }
            return Channel(
                id: idx,
                name: s.name,
                url: url,
                logo: URL(string: s.stream_icon ?? ""),
                group: liveCatMap[s.category_id?.value ?? ""] ?? "Uncategorized"
            )
        }
        let liveGroups = sortedGroups(channels.map(\.group))

        let movies: [Movie] = vs.enumerated().compactMap { idx, s in
            let ext = s.container_extension ?? "mp4"
            let urlStr = "\(creds.baseUrl)/movie/\(creds.username)/\(creds.password)/\(s.stream_id.value).\(ext)"
            guard let url = URL(string: urlStr) else { return nil }
            return Movie(
                id: idx,
                name: s.name,
                url: url,
                poster: URL(string: s.stream_icon ?? ""),
                group: vodCatMap[s.category_id?.value ?? ""] ?? "Uncategorized",
                rating: s.rating?.value ?? ""
            )
        }
        let movieGroups = sortedGroups(movies.map(\.group))

        let series: [Series] = ss.enumerated().compactMap { idx, s in
            Series(
                id: idx,
                seriesId: s.series_id.value,
                name: s.name,
                poster: URL(string: s.cover ?? ""),
                group: serCatMap[s.category_id?.value ?? ""] ?? "Uncategorized",
                rating: s.rating?.value ?? "",
                plot: s.plot ?? ""
            )
        }
        let seriesGroups = sortedGroups(series.map(\.group))

        return Catalog(
            channels: channels, liveGroups: liveGroups,
            movies: movies, movieGroups: movieGroups,
            series: series, seriesGroups: seriesGroups
        )
    }

    func fetchSeriesDetail(_ series: Series) async throws -> SeriesDetail {
        var comps = URLComponents(string: "\(creds.baseUrl)/player_api.php")!
        comps.queryItems = [
            URLQueryItem(name: "username", value: creds.username),
            URLQueryItem(name: "password", value: creds.password),
            URLQueryItem(name: "action", value: "get_series_info"),
            URLQueryItem(name: "series_id", value: series.seriesId),
        ]
        guard let url = comps.url else { throw XtreamError.badResponse }
        let (data, resp) = try await URLSession.shared.data(from: url)
        guard (resp as? HTTPURLResponse)?.statusCode == 200 else { throw XtreamError.badResponse }

        guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let episodesRoot = root["episodes"] as? [String: Any] else {
            return SeriesDetail(series: series, seasons: [:])
        }

        var seasons: [Int: [Episode]] = [:]
        for (key, value) in episodesRoot {
            guard let seasonNum = Int(key),
                  let rawEpisodes = value as? [[String: Any]] else { continue }
            var list: [Episode] = []
            for ep in rawEpisodes {
                guard let id = (ep["id"] as? String) ?? (ep["id"] as? Int).map(String.init) else { continue }
                let title = (ep["title"] as? String) ?? "Episode"
                let ext = (ep["container_extension"] as? String) ?? "mkv"
                let num: Int = {
                    if let s = ep["episode_num"] as? String, let n = Int(s) { return n }
                    if let n = ep["episode_num"] as? Int { return n }
                    return 0
                }()
                let info = ep["info"] as? [String: Any]
                let plot = (info?["plot"] as? String) ?? ""
                let duration = (info?["duration"] as? String) ?? ""
                let urlStr = "\(creds.baseUrl)/series/\(creds.username)/\(creds.password)/\(id).\(ext)"
                guard let url = URL(string: urlStr) else { continue }
                list.append(Episode(
                    id: id, title: title, season: seasonNum,
                    episodeNum: num, url: url, plot: plot, duration: duration
                ))
            }
            list.sort { $0.episodeNum < $1.episodeNum }
            seasons[seasonNum] = list
        }
        return SeriesDetail(series: series, seasons: seasons)
    }

    private func sortedGroups(_ raw: [String]) -> [String] {
        let unique = Array(Set(raw))
        return unique.sorted { a, b in
            if a == "Uncategorized" { return false }
            if b == "Uncategorized" { return true }
            return a.localizedCaseInsensitiveCompare(b) == .orderedAscending
        }
    }

    private func callList<T: Decodable>(_ action: String) async throws -> [T] {
        var comps = URLComponents(string: "\(creds.baseUrl)/player_api.php")!
        comps.queryItems = [
            URLQueryItem(name: "username", value: creds.username),
            URLQueryItem(name: "password", value: creds.password),
            URLQueryItem(name: "action", value: action),
        ]
        guard let url = comps.url else { throw XtreamError.badResponse }
        let (data, resp) = try await URLSession.shared.data(from: url)
        guard (resp as? HTTPURLResponse)?.statusCode == 200 else { throw XtreamError.badResponse }

        guard let rawItems = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            throw XtreamError.notJSON
        }
        let decoder = JSONDecoder()
        var results: [T] = []
        results.reserveCapacity(rawItems.count)
        for item in rawItems {
            guard let sub = try? JSONSerialization.data(withJSONObject: item) else { continue }
            if let decoded = try? decoder.decode(T.self, from: sub) {
                results.append(decoded)
            }
        }
        return results
    }
}

private struct RawCategory: Decodable {
    let category_id: FlexibleString
    let category_name: String
}

private struct RawLiveStream: Decodable {
    let name: String
    let stream_id: FlexibleString
    let stream_icon: String?
    let category_id: FlexibleString?
}

private struct RawVodStream: Decodable {
    let name: String
    let stream_id: FlexibleString
    let stream_icon: String?
    let category_id: FlexibleString?
    let container_extension: String?
    let rating: FlexibleString?
}

private struct RawSeries: Decodable {
    let name: String
    let series_id: FlexibleString
    let cover: String?
    let category_id: FlexibleString?
    let rating: FlexibleString?
    let plot: String?
}
