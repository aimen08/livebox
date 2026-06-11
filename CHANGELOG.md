# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-06-11

### Changed
- Player error screen now reports the actual failure reason instead of a generic message: HTTP status codes from the provider (including a dedicated hint when the network is blocked with HTTP 456, typically a VPN), decode/codec errors, and network errors for both HLS and direct streams.
