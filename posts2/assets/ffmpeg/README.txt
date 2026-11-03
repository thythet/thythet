FFmpeg.wasm wrapper and classic worker (version 0.12.15)
Source project: https://github.com/ffmpegwasm/ffmpeg.wasm
Vendored UMD distribution files obtained from https://github.com/simonw/tools/tree/main/ffmpeg-wasm
License: MIT (see LICENSE)
The matching ffmpeg.js and 814.ffmpeg.js must be served together on the
same origin for the UMD wrapper to instantiate its default CLASSIC worker.
Do not pass classWorkerURL to ffmpeg.load() for this UMD build, because it
would create a module worker which cannot execute importScripts().
The large single-thread @ffmpeg/core engine is downloaded only on demand.
