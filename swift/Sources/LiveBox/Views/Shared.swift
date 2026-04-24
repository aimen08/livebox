import SwiftUI

struct TopBar: View {
    let title: String
    let subtitle: String
    @Binding var query: String

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(Theme.text)
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.text3)
            }
            Spacer()
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(Theme.text3)
                TextField("Search", text: $query)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.text)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .frame(width: 240)
            .background(Theme.surface)
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.border, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(Theme.bg)
        .overlay(Divider().background(Theme.border), alignment: .bottom)
    }
}

struct GroupSidebar: View {
    let groups: [String]
    @Binding var selected: String?
    let total: Int

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 2) {
                GroupRow(label: "All", count: total, active: selected == nil) {
                    selected = nil
                }
                ForEach(groups, id: \.self) { g in
                    GroupRow(label: g, count: nil, active: selected == g) {
                        selected = g
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 12)
        }
        .frame(width: 220)
        .background(Theme.surface)
    }
}

private struct GroupRow: View {
    let label: String
    let count: Int?
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(label)
                    .font(.system(size: 13, weight: active ? .semibold : .regular))
                    .foregroundStyle(active ? Theme.text : Theme.text2)
                    .lineLimit(1)
                Spacer()
                if let count {
                    Text("\(count)")
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text3)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(active ? Theme.surface3 : Color.clear)
            )
        }
        .buttonStyle(.plain)
    }
}
