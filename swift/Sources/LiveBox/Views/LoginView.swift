import SwiftUI

struct LoginView: View {
    @EnvironmentObject var app: AppState
    @State private var m3uUrl = ""

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("LB")
                    .font(.system(size: 56, weight: .black, design: .rounded))
                    .foregroundStyle(LinearGradient(colors: [Theme.accent, Theme.accentBright],
                                                    startPoint: .topLeading, endPoint: .bottomTrailing))
                Text("LiveBox")
                    .font(.system(size: 20, weight: .semibold))
                    .tracking(3)
                Text("Paste your M3U playlist URL")
                    .foregroundStyle(Theme.text3)
                    .font(.system(size: 13))
            }

            VStack(alignment: .leading, spacing: 6) {
                Field(icon: "link", placeholder: "http://host/get.php?username=…&password=…", text: $m3uUrl)
                Text("Example: http://cf.example.vip/get.php?username=abc&password=123&type=m3u_plus&output=ts")
                    .font(.system(size: 11))
                    .foregroundStyle(Theme.text3)
                    .lineLimit(2)
                    .truncationMode(.middle)
            }
            .frame(maxWidth: 480)

            Button {
                Task { await app.login(m3uUrl: m3uUrl) }
            } label: {
                Text("Connect")
                    .font(.system(size: 14, weight: .semibold))
                    .frame(maxWidth: 480, minHeight: 40)
                    .foregroundStyle(Color.white)
                    .background(
                        LinearGradient(colors: [Theme.accent, Theme.accentBright],
                                       startPoint: .leading, endPoint: .trailing)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
            .disabled(m3uUrl.isEmpty)
            .opacity(m3uUrl.isEmpty ? 0.5 : 1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(40)
    }
}

private struct Field: View {
    let icon: String
    let placeholder: String
    @Binding var text: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .foregroundStyle(Theme.text3)
                .frame(width: 16)
            TextField(placeholder, text: $text)
                .textFieldStyle(.plain)
                .font(.system(size: 14))
                .foregroundStyle(Theme.text)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Theme.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
