import SwiftUI

enum Theme {
    static let bg = Color(hex: 0x0A0A0A)
    static let surface = Color(hex: 0x111111)
    static let surface2 = Color(hex: 0x1A1A1A)
    static let surface3 = Color(hex: 0x222222)
    static let border = Color(hex: 0x2A2A2A)
    static let text = Color(hex: 0xF0F0F0)
    static let text2 = Color(hex: 0xC0C0C0)
    static let text3 = Color(hex: 0x909090)
    static let accent = Color(hex: 0xE50914)
    static let accentBright = Color(hex: 0xFF1A24)
}

extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: 1)
    }
}
