import SwiftUI

struct Sidebar: View {
    @Binding var page: Page
    let onLogout: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
                Text("LB")
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .foregroundStyle(LinearGradient(colors: [Theme.accent, Theme.accentBright],
                                                    startPoint: .topLeading, endPoint: .bottomTrailing))
                Text("LiveBox")
                    .font(.system(size: 14, weight: .semibold))
                    .tracking(2)
                    .foregroundStyle(Theme.text)
            }
            .padding(.bottom, 24)
            .padding(.top, 12)

            NavItem(title: "Live TV", systemImage: "dot.radiowaves.left.and.right",
                    active: page == .live) { page = .live }
            NavItem(title: "Movies", systemImage: "film",
                    active: page == .movies) { page = .movies }
            NavItem(title: "Series", systemImage: "tv",
                    active: page == .series) { page = .series }

            Spacer()

            Button(action: onLogout) {
                HStack(spacing: 10) {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                    Text("Sign out")
                }
                .font(.system(size: 13))
                .foregroundStyle(Theme.text3)
            }
            .buttonStyle(.plain)
            .padding(.vertical, 10)
            .padding(.horizontal, 12)
        }
        .padding(.horizontal, 16)
        .frame(width: 200)
        .background(Theme.surface)
    }
}

private struct NavItem: View {
    let title: String
    let systemImage: String
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: systemImage)
                    .frame(width: 18)
                Text(title)
                Spacer()
            }
            .font(.system(size: 14, weight: active ? .semibold : .regular))
            .foregroundStyle(active ? Theme.text : Theme.text2)
            .padding(.vertical, 10)
            .padding(.horizontal, 12)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(active ? Theme.surface3 : Color.clear)
            )
        }
        .buttonStyle(.plain)
    }
}
