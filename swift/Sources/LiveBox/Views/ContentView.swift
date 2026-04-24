import SwiftUI

enum Page: Hashable {
    case live
    case movies
    case series
}

struct ContentView: View {
    @EnvironmentObject var app: AppState
    @State private var page: Page = .live

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            switch app.state {
            case .idle:
                LoginView()
            case .loading(let msg):
                LoadingView(message: msg)
            case .failed(let msg):
                FailureView(message: msg)
            case .ready:
                HStack(spacing: 0) {
                    Sidebar(page: $page, onLogout: { app.logout() })
                    Divider().background(Theme.border)
                    Group {
                        switch page {
                        case .live:
                            LiveView(channels: app.catalog.channels, groups: app.catalog.liveGroups)
                        case .movies:
                            MoviesView(movies: app.catalog.movies, groups: app.catalog.movieGroups)
                        case .series:
                            SeriesView(series: app.catalog.series, groups: app.catalog.seriesGroups)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
        .foregroundStyle(Theme.text)
    }
}

struct LoadingView: View {
    let message: String
    var body: some View {
        VStack(spacing: 18) {
            Text("LB")
                .font(.system(size: 36, weight: .black, design: .rounded))
                .foregroundStyle(LinearGradient(colors: [Theme.accent, Theme.accentBright],
                                                startPoint: .topLeading, endPoint: .bottomTrailing))
            ProgressView()
                .controlSize(.small)
            Text(message)
                .foregroundStyle(Theme.text3)
                .font(.system(size: 13))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct FailureView: View {
    @EnvironmentObject var app: AppState
    let message: String
    var body: some View {
        VStack(spacing: 14) {
            Text(message)
                .foregroundStyle(Theme.text2)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            HStack(spacing: 10) {
                Button("Try again") { Task { await app.loadCatalog() } }
                    .buttonStyle(.borderedProminent)
                Button("Sign out") { app.logout() }
                    .buttonStyle(.bordered)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
