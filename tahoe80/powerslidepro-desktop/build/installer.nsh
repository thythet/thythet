; PowerSlidePro .deckcraft document icon refresh for Windows.
; The extension and ProgID are registered by electron-builder; do not
; override Windows UserChoice or reset any user's defaults.
; Notify Explorer to reload icon and association resources after install.
!macro customInstall
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x1000, i 0, i 0)'
!macroend
