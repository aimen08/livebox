import SwiftUI

struct MoviesView: View {
    let movies: [Movie]
    let groups: [String]

    @State private var selectedGroup: String? = nil
    @State private var query: String = ""
    @State private var playing: Movie? = nil

    private var filtered: [Movie] {
        var list = movies
        if let g = selectedGroup {
            list = list.filter { $0.group == g }
        }
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty {
            list = list.filter { $0.name.lowercased().contains(q) }
        }
        return list
    }

    private let columns = [GridItem(.adaptive(minimum: 160, maximum: 200), spacing: 16)]

    var body: some View {
        HStack(spacing: 0) {
            GroupSidebar(groups: groups, selected: $selectedGroup, total: movies.count)
            Divider().background(Theme.border)
            VStack(spacing: 0) {
                TopBar(title: "Movies", subtitle: "\(filtered.count) titles", query: $query)
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 20) {
                        ForEach(filtered) { m in
                            PosterTile(
                                title: m.name,
                                subtitle: m.rating.isEmpty ? m.group : "★ \(m.rating)",
                                url: m.poster
                            ) {
                                playing = m
                            }
                        }
                    }
                    .padding(24)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .overlay {
            if let m = playing {
                PlayerSheet(url: m.url, title: m.name) { playing = nil }
                    .transition(.opacity)
            }
        }
    }
}

struct PosterTile: View {
    let title: String
    let subtitle: String
    let url: URL?
    let action: () -> Void

    @State private var hover = false

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                ZStack {
                    Theme.surface2
                    if let url {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().aspectRatio(contentMode: .fill)
                            default:
                                Image(systemName: "film")
                                    .font(.system(size: 32))
                                    .foregroundStyle(Theme.text3)
                            }
                        }
                    } else {
                        Image(systemName: "film")
                            .font(.system(size: 32))
                            .foregroundStyle(Theme.text3)
                    }
                }
                .aspectRatio(2.0/3.0, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(hover ? Theme.accent : Color.clear, lineWidth: 2)
                )
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Theme.text)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text3)
                        .lineLimit(1)
                }
            }
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
        .scaleEffect(hover ? 1.03 : 1.0)
        .animation(.easeOut(duration: 0.15), value: hover)
    }
}
