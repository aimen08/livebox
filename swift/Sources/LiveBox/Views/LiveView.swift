import SwiftUI

struct LiveView: View {
    let channels: [Channel]
    let groups: [String]

    @State private var selectedGroup: String? = nil
    @State private var query: String = ""
    @State private var playing: Channel? = nil

    private var filtered: [Channel] {
        var list = channels
        if let g = selectedGroup {
            list = list.filter { $0.group == g }
        }
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty {
            list = list.filter { $0.name.lowercased().contains(q) }
        }
        return list
    }

    var body: some View {
        HStack(spacing: 0) {
            GroupSidebar(groups: groups, selected: $selectedGroup, total: channels.count)
            Divider().background(Theme.border)
            VStack(spacing: 0) {
                TopBar(title: "Live TV", subtitle: "\(filtered.count) channels", query: $query)
                if let ch = playing {
                    PlayerSheet(url: ch.url, title: ch.name) { playing = nil }
                        .frame(height: 360)
                        .background(Color.black)
                        .id(ch.id)
                }
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(filtered) { ch in
                            ChannelRow(channel: ch, isPlaying: ch.id == playing?.id) {
                                playing = ch
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                }
            }
            .frame(maxWidth: .infinity)
        }
    }
}

private struct ChannelRow: View {
    let channel: Channel
    let isPlaying: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                AsyncLogo(url: channel.logo)
                    .frame(width: 40, height: 40)
                VStack(alignment: .leading, spacing: 2) {
                    Text(channel.name)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Theme.text)
                        .lineLimit(1)
                    Text(channel.group)
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.text3)
                        .lineLimit(1)
                }
                Spacer()
                if isPlaying {
                    Text("PLAYING")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(1)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Theme.accent)
                        .clipShape(Capsule())
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isPlaying ? Theme.surface2 : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
}

struct AsyncLogo: View {
    let url: URL?
    var body: some View {
        ZStack {
            Theme.surface2
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fit)
                    default:
                        Image(systemName: "tv")
                            .foregroundStyle(Theme.text3)
                    }
                }
            } else {
                Image(systemName: "tv").foregroundStyle(Theme.text3)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}
