{
  "targets": [
    {
      "target_name": "embedded_mpv",
      "sources": [],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<!(node -p \"process.env.LIBMPV_INCLUDE_DIR || '/opt/homebrew/include'\")",
        "src"
      ],
      "defines": [
        "NAPI_CPP_EXCEPTIONS"
      ],
      "cflags_cc": [
        "-fexceptions",
        "-std=c++20"
      ],
      "conditions": [
        [
          "OS==\"mac\"",
          {
            "sources": [
              "src/embedded_mpv.mm"
            ],
            "xcode_settings": {
              "CLANG_CXX_LANGUAGE_STANDARD": "c++20",
              "CLANG_ENABLE_OBJC_ARC": "YES",
              "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
              "MACOSX_DEPLOYMENT_TARGET": "10.15",
              "OTHER_LDFLAGS": [
                "-Wl,-rpath,@loader_path/lib"
              ]
            },
            "libraries": [
              "-framework AppKit",
              "-framework CoreVideo",
              "-framework Foundation",
              "-framework OpenGL",
              "-framework QuartzCore",
              "<!(node -e \"const path = require('path'); const dir = process.env.LIBMPV_LIBRARY_DIR || '/opt/homebrew/lib'; process.stdout.write(path.join(dir, 'libmpv.2.dylib'))\")"
            ]
          }
        ]
      ]
    }
  ]
}
