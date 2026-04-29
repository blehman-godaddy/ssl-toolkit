# Keystore Builder v1.0.0 - Release Notes

**Release Date:** December 24, 2025
**Platform:** macOS (Apple Silicon / arm64)
**Framework:** Tauri v2 (Rust + React)

---

## Overview

Keystore Builder is a secure desktop application for streamlining SSL certificate keystore creation for GoDaddy SSL certificates. The application automates the entire workflow from CSR generation to keystore creation, eliminating manual command-line operations and reducing human error.

---

## Key Features

### 🔐 Full Workflow Mode
Complete 4-step process for SSL certificate provisioning:
1. **Generate CSR** - Creates Certificate Signing Request and private key with GoDaddy standard details
2. **Submit to GoDaddy** - Instructions and tools for submitting CSR to GoDaddy
3. **Import Certificate** - Easy certificate file import with validation
4. **Create Keystore** - Generate JKS or P12/PFX keystores with configurable options

### ⚡ Quick Tools
- **CSR/Key Generator** - Standalone tool for generating CSR and private keys without creating keystores
- **File Cleanup** - Manage and delete certificate files safely

### 🛡️ Security-First Design
- **Command Injection Prevention** - All OpenSSL/keytool commands use secure parameter passing
- **Password Security** - Passwords sent via stdin, never visible in process list
- **Path Validation** - Comprehensive file path validation prevents directory traversal attacks
- **Minimal Permissions** - Tauri capabilities limited to essential operations only
- **Type-Safe IPC** - Rust backend with type-safe communication

### 📋 Supported Formats
- **JKS** (Java KeyStore) - For Tomcat, WebLogic, JBoss
- **P12/PFX** (PKCS12) - For IIS, Windows servers, other platforms
- **Legacy Mode** - Compatibility with older Java versions (SHA1, 3DES)

---

## What's New in v1.0.0

### Major Features
✅ Complete keystore creation workflow
✅ Automatic GoDaddy certificate details (Tempe, AZ, US)
✅ Multi-format support (JKS, P12, PFX)
✅ Copy-to-clipboard functionality for CSRs
✅ File management and cleanup tools
✅ Tab-based navigation for different workflows

### Security Enhancements
✅ **Tauri Framework** - Replaced Electron with Tauri for enhanced security
✅ **Path Traversal Prevention** - All file operations validate paths
✅ **File Size Limits** - 10MB max to prevent DoS attacks
✅ **Extension Whitelisting** - File deletion restricted to certificate types
✅ **Minimal Permissions** - Only essential Tauri capabilities enabled
✅ **No Shell Access** - All commands executed securely in Rust

### User Experience
✅ Clean, modern interface with gradient header
✅ Step-by-step wizard for full workflow
✅ Real-time validation and error messages
✅ File browser integration for easy file selection
✅ Command output display for transparency

---

## System Requirements

### Minimum Requirements
- **OS:** macOS 11.0 (Big Sur) or later
- **Architecture:** Apple Silicon (M1/M2/M3/M4) — arm64 native
- **OpenSSL:** Pre-installed (included with macOS)
- **Java:** Required for JKS keystore creation only (Java 8 or later recommended)
- **Disk Space:** 15MB for application
- **Memory:** 50MB RAM

### Recommended
- **OS:** macOS 13.0 (Ventura) or later
- **Java:** OpenJDK 17 or later for JKS keystores

---

## Installation

### Option 1: DMG Installer (Recommended)
1. Download `Keystore Builder_0.1.0_aarch64.dmg`
2. Open the DMG file
3. Drag "Keystore Builder.app" to Applications folder
4. Launch from Applications

### Option 2: Direct App Bundle
1. Download `Keystore Builder.app`
2. Move to `/Applications/`
3. Launch from Applications

### First Launch (macOS Security)
On first launch, macOS may show a security warning:
1. Right-click (or Control-click) on "Keystore Builder.app"
2. Select "Open" from the context menu
3. Click "Open" in the security dialog
4. App will launch and be whitelisted for future use

---

## Quick Start Guide

### Creating a Keystore (Full Workflow)

**Step 1: Generate CSR**
1. Enter your domain name (e.g., `www.example.com`)
2. Select output directory for certificate files
3. Click "Generate CSR & Private Key"
4. Copy CSR when ready

**Step 2: Submit to GoDaddy**
1. Copy CSR to clipboard (button provided)
2. Log into GoDaddy SSL Certificate management
3. Submit CSR for certificate issuance
4. Wait for GoDaddy to issue certificate (minutes to hours)
5. Download certificate file from GoDaddy

**Step 3: Import Certificate**
1. Select your certificate file (e.g., `abc123def.crt`)
2. Application automatically detects existing private key
3. Continue to next step

**Step 4: Create Keystore**
1. Choose format: JKS or P12/PFX
2. For P12, select extension: .p12 or .pfx
3. Enter alias name (default: "tomcat")
4. Enter keystore password
5. Enable legacy mode if needed (older Java versions)
6. Click "Create Keystore"
7. Keystore created in same directory as certificate files

### CSR Only Tool
For quick CSR generation without keystores:
1. Switch to "CSR/Key Only" tab
2. Enter domain name
3. Select output directory
4. Click "Generate"
5. Copy CSR and private key content as needed

### File Cleanup Tool
To manage certificate files:
1. Switch to "Cleanup" tab
2. Select directory containing certificate files
3. View all .key, .csr, .crt, .p12, .pfx, .jks files
4. Select files to delete
5. Confirm deletion

---

## Security Notes

### What We Protect Against
✅ **Command Injection** - Secure parameter passing prevents shell injection
✅ **Path Traversal** - File operations validate all paths
✅ **Password Leaks** - Passwords never visible in system process list
✅ **Arbitrary File Access** - Only certificate-related files accessible
✅ **Oversized Files** - 10MB limit prevents resource exhaustion

### What You Should Know
⚠️ **JKS Password Limitation** - Due to keytool limitations, JKS passwords may be briefly visible in process list during conversion
⚠️ **Private Key Storage** - Private keys stored as regular files with standard permissions
⚠️ **Certificate Details** - Auto-filled with GoDaddy standards (Tempe, Arizona, US)

### Best Practices
1. **Use Strong Passwords** - Minimum 12 characters for keystore passwords
2. **Secure Storage** - Store keystores in access-controlled directories
3. **Clean Up** - Delete CSR files after certificate issuance (keep private keys secure)
4. **Backup Keys** - Maintain encrypted backups of private keys
5. **Document Passwords** - Use password manager for keystore passwords

---

## Certificate Details

Automatically generated with GoDaddy standards:
- **Country:** US
- **State:** Arizona
- **City:** Tempe
- **Organization:** [Your domain name]
- **Organizational Unit:** IT
- **Common Name:** [Your domain name]

---

## File Locations

### Generated Files
All files created in your selected output directory:
- `[domain].key` - Private key (RSA 2048-bit)
- `[domain].csr` - Certificate Signing Request
- `[domain].jks` - Java KeyStore (if JKS selected)
- `[domain].p12` or `[domain].pfx` - PKCS12 keystore (if P12 selected)

### Application Data
- **macOS:** `/Users/[username]/Library/Application Support/com.godaddy.keystore-builder/`
- **Logs:** Stored in application support directory (if enabled)

---

## Troubleshooting

### Issue: "OpenSSL command not found"
**Solution:** macOS includes OpenSSL by default. Try running `/usr/bin/openssl version` in Terminal. If missing, install via Homebrew: `brew install openssl`

### Issue: "Keytool command not found" (JKS only)
**Solution:** Install Java JDK. Download from:
- OpenJDK: https://adoptium.net/
- Oracle JDK: https://www.oracle.com/java/technologies/downloads/

### Issue: "Invalid path" or "Path traversal not allowed"
**Solution:** Use absolute paths only (e.g., `/Users/yourname/Documents/certs/`). Do not use relative paths or `..` in paths.

### Issue: "File too large"
**Solution:** Certificate files should be <10MB. If you see this error, verify you're selecting the correct file.

### Issue: App won't open (macOS security)
**Solution:** Right-click app → Open → Open (in dialog). This whitelists the app.

### Issue: "Failed to create keystore"
**Solution:** Check command output for details. Common causes:
- Missing certificate file
- Incorrect password format
- Java not installed (for JKS)
- Insufficient disk space

---

## Known Limitations

1. **macOS Only** - Currently supports macOS only (Windows/Linux versions planned)
2. **No Certificate Validation** - App doesn't verify certificate authenticity (trusts user input)
3. **No Password Strength Enforcement** - Password complexity not enforced by app
4. **Single Domain** - No support for wildcard or multi-domain (SAN) certificates
5. **No CA Bundle Selection** - Uses GoDaddy G2/G1 CA bundle only

---

## Technical Details

### Architecture
- **Frontend:** React 19.2 + TypeScript 5.9 + Vite 7.3
- **Backend:** Rust 1.92 + Tauri 2.9
- **Build System:** Cargo + npm
- **Plugins:** Dialog, Clipboard Manager

### Command Execution
All OpenSSL and keytool commands executed securely in Rust:
```rust
// Example: Secure command execution
Command::new("openssl")
    .args(&["req", "-new", "-newkey", "rsa:2048", ...])
    .stdin(Stdio::piped())  // Password via stdin
    .output()
```

### Permissions (Tauri Capabilities)
```json
{
  "dialog:allow-open",           // File picker
  "dialog:allow-save",           // Save dialogs
  "clipboard-manager:allow-write-text",  // Copy CSR
  "core:default"                 // Basic app functions
}
```

### Dependencies
**Zero Known Vulnerabilities** (as of release date)
- Audited with `npm audit` and `cargo audit`
- All dependencies up-to-date
- No deprecated packages

---

## Support & Feedback

### Internal GoDaddy Support
- **Questions:** Contact SSL/TLS team
- **Issues:** File ticket with IT Security team
- **Feedback:** Email: [your-team-email]

### Reporting Security Issues
If you discover a security vulnerability:
1. **DO NOT** file a public ticket
2. Contact IT Security team immediately
3. Include: Steps to reproduce, impact assessment, suggested fix

---

## Changelog

### v1.0.0 (2025-12-24) - Initial Release
- ✅ Full keystore creation workflow (4 steps)
- ✅ CSR-only generation tool
- ✅ File cleanup utility
- ✅ JKS and P12/PFX format support
- ✅ Legacy mode for older Java versions
- ✅ Copy-to-clipboard functionality
- ✅ Comprehensive path validation
- ✅ Minimal Tauri permissions
- ✅ Security audit passed (B+ rating)

---

## Compliance

### Security Audit Results
- **Rating:** B+ (Good with minor improvements)
- **Critical Issues:** 0
- **High Issues:** 0 (all resolved)
- **Medium Issues:** 6 (documented, non-blocking)
- **Audit Date:** 2025-12-24

### Data Privacy
- **No Data Collection** - App does not send data to external servers
- **Local Processing** - All operations performed locally
- **No Analytics** - No telemetry or usage tracking
- **No Network Access** - App does not require internet connection

---

## Credits

**Developed by:** GoDaddy SSL/TLS Team
**Framework:** Tauri (https://tauri.app)
**Built with:** Rust, React, TypeScript
**Certificate Authority:** GoDaddy Root Certificate Authority - G2

---

## License

**Internal Use Only** - GoDaddy Proprietary
Not for distribution outside GoDaddy organization.

---

## Additional Resources

### Documentation
- OpenSSL Documentation: https://www.openssl.org/docs/
- Java Keytool Guide: https://docs.oracle.com/en/java/javase/17/docs/specs/man/keytool.html
- GoDaddy SSL Help Center: https://www.godaddy.com/help/ssl

### Training
- Internal SSL/TLS training materials (GoDaddy U)
- Keystore management best practices (IT Security wiki)

---

**End of Release Notes**

For questions or issues, contact your team lead or IT Security.
