import Foundation

struct XtreamCreds: Codable, Equatable {
    var baseUrl: String
    var username: String
    var password: String
}

struct Channel: Identifiable, Hashable {
    let id: Int
    let name: String
    let url: URL
    let logo: URL?
    let group: String
}

struct Movie: Identifiable, Hashable {
    let id: Int
    let name: String
    let url: URL
    let poster: URL?
    let group: String
    let rating: String
}

struct Series: Identifiable, Hashable {
    let id: Int            // stable index from catalog order
    let seriesId: String   // Xtream series_id
    let name: String
    let poster: URL?
    let group: String
    let rating: String
    let plot: String
}

struct Episode: Identifiable, Hashable {
    let id: String
    let title: String
    let season: Int
    let episodeNum: Int
    let url: URL
    let plot: String
    let duration: String
}

struct SeriesDetail {
    let series: Series
    let seasons: [Int: [Episode]]   // season number -> episodes
    var sortedSeasons: [Int] { seasons.keys.sorted() }
}

struct Catalog {
    var channels: [Channel] = []
    var liveGroups: [String] = []
    var movies: [Movie] = []
    var movieGroups: [String] = []
    var series: [Series] = []
    var seriesGroups: [String] = []
}
