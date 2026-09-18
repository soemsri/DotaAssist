# Windows desktop delivery, interaction, and onboarding

Date: 2026-09-17
Status: Accepted

The alignment interview selected Windows Tauri delivery, click-through overlay interaction controlled by a configurable global shortcut, and guided automatic GSI setup.

The default development launcher uses Tauri and the embedded Rust GSI server. Browser/PiP remains an explicit development command. Windows builds target the NSIS installer.

Rust owns shortcut registration and cursor interception. Entering the overlay requires a registered shortcut and begins click-through; the shortcut toggles interaction without requesting focus. The dashboard is interactive and does not stay above other apps. Preferences persist in the app configuration directory. Registration errors leave the dashboard accessible.

On first launch, Settings detects Steam roots and additional libraries, allows a manually entered path, and requires confirmation before writing. The backend validates the Dota installation, backs up existing DotaAssist configuration using exclusive numbered backup files, and installs the bundled GSI template. Live connection status comes from received Dota 2 payloads rather than installation success. The user still enables the Steam launch option and restarts the game.

Trade-offs: global shortcuts can conflict with other applications; unusual Steam installs may require a pasted path; protected folders may reject writes. These failures appear in the UI. Windows installer and gameplay interaction must be validated on Windows; Linux checks cannot establish them.

The shortcut implementation uses the official Tauri plugin: https://v2.tauri.app/plugin/global-shortcut/
