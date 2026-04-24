import SwiftUI

struct SeriesView: View {
    let series: [Series]
    let groups: [String]

    @State private var selectedGroup: String? = nil
    @State private var query: String = ""
    @State private var openSeries: Series? = nil
    @State private var playing: Episode? = nil

    @EnvironmentObject var app: AppState

    private var filtered: [Series] {
        var list = series
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
            GroupSidebar(groups: groups, selected: $selectedGroup, total: series.count)
            Divider().background(Theme.border)
            VStack(spacing: 0) {
                TopBar(title: "Series", subtitle: "\(filtered.count) shows", query: $query)
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 20) {
                        ForEach(filtered) { s in
                            PosterTile(
                                title: s.name,
                                subtitle: s.rating.isEmpty ? s.group : "★ \(s.rating)",
                                url: s.poster
                            ) {
                                openSeries = s
                            }
                        }
                    }
                    .padding(24)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .overlay {
            if let s = openSeries {
                SeriesDetailSheet(series: s, onPlay: { ep in
                    openSeries = nil
                    playing = ep
                }, onClose: { openSeries = nil })
                .transition(.opacity)
            }
        }
        .overlay {
            if let ep = playing {
                PlayerSheet(url: ep.url, title: ep.title) { playing = nil }
                    .transition(.opacity)
            }
        }
    }
}

struct SeriesDetailSheet: View {
    let series: Series
    let onPlay: (Episode) -> Void
    let onClose: () -> Void

    @EnvironmentObject var app: AppState
    @State private var detail: SeriesDetail?
    @State private var loading = true
    @State private var selectedSeason: Int? = nil
    @State private var error: String?

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.opacity(0.85).ignoresSafeArea()
            VStack(spacing: 0) {
                header
                Divider().background(Theme.border)
                content
            }
            .frame(maxWidth: 900, maxHeight: 640)
            .background(Theme.bg)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 1))
            .padding(40)

            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(10)
                    .background(Color.black.opacity(0.6))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .padding(52)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task {
            await loadDetail()
        }
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 16) {
            ZStack {
                Theme.surface2
                if let url = series.poster {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image): image.resizable().aspectRatio(contentMode: .fill)
                        default: Image(systemName: "tv").foregroundStyle(Theme.text3)
                        }
                    }
                }
            }
            .frame(width: 120, height: 180)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 8) {
                Text(series.name)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(Theme.text)
                if !series.rating.isEmpty {
                    Text("★ \(series.rating)")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.text2)
                }
                Text(series.group)
                    .font(.system(size: 11))
                    .foregroundStyle(Theme.text3)
                if !series.plot.isEmpty {
                    Text(series.plot)
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.text2)
                        .lineLimit(6)
                }
                Spacer(minLength: 0)
            }
            Spacer(minLength: 0)
        }
        .padding(20)
    }

    @ViewBuilder
    private var content: some View {
        if loading {
            VStack { ProgressView().controlSize(.small) }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let error {
            VStack {
                Text(error)
                    .foregroundStyle(Theme.text2)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let detail, !detail.seasons.isEmpty {
            VStack(spacing: 0) {
                seasonPicker(for: detail)
                Divider().background(Theme.border)
                episodeList(for: detail)
            }
        } else {
            Text("No episodes found.")
                .foregroundStyle(Theme.text3)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func seasonPicker(for detail: SeriesDetail) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(detail.sortedSeasons, id: \.self) { s in
                    let active = (selectedSeason ?? detail.sortedSeasons.first ?? 0) == s
                    Button {
                        selectedSeason = s
                    } label: {
                        Text("Season \(s)")
                            .font(.system(size: 12, weight: active ? .semibold : .regular))
                            .foregroundStyle(active ? Color.white : Theme.text2)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(
                                Capsule().fill(active ? Theme.accent : Theme.surface3)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
        }
    }

    private func episodeList(for detail: SeriesDetail) -> some View {
        let s = selectedSeason ?? detail.sortedSeasons.first ?? 0
        let episodes = detail.seasons[s] ?? []
        return ScrollView {
            LazyVStack(spacing: 2) {
                ForEach(episodes) { ep in
                    Button {
                        onPlay(ep)
                    } label: {
                        HStack(spacing: 12) {
                            Text("\(ep.episodeNum)")
                                .font(.system(size: 13, weight: .semibold).monospacedDigit())
                                .foregroundStyle(Theme.text3)
                                .frame(width: 28, alignment: .trailing)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(ep.title)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(Theme.text)
                                    .lineLimit(1)
                                if !ep.plot.isEmpty {
                                    Text(ep.plot)
                                        .font(.system(size: 11))
                                        .foregroundStyle(Theme.text3)
                                        .lineLimit(2)
                                }
                            }
                            Spacer()
                            if !ep.duration.isEmpty {
                                Text(ep.duration)
                                    .font(.system(size: 11))
                                    .foregroundStyle(Theme.text3)
                            }
                            Image(systemName: "play.fill")
                                .font(.system(size: 10))
                                .foregroundStyle(Theme.text3)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 6).fill(Theme.surface2)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
        }
    }

    private func loadDetail() async {
        guard let creds = app.creds else {
            error = "Not connected"
            loading = false
            return
        }
        do {
            let client = XtreamClient(creds: creds)
            let d = try await client.fetchSeriesDetail(series)
            detail = d
            selectedSeason = d.sortedSeasons.first
        } catch {
            self.error = "Couldn’t load episodes: \(error.localizedDescription)"
        }
        loading = false
    }
}
