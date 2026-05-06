use std::path::PathBuf;
use std::process::Command;
use std::fs;
use std::time::SystemTime;
use serde::{Deserialize, Serialize};
use tauri::Manager;

// Security: Validate and canonicalize file paths to prevent directory traversal
fn validate_path(path_str: &str) -> Result<PathBuf, String> {
    // Check for path traversal patterns
    if path_str.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let path = PathBuf::from(path_str);

    // Require absolute paths
    if !path.is_absolute() {
        return Err("Only absolute paths are allowed".to_string());
    }

    // Canonicalize to resolve any symlinks or relative components
    // This will also verify the path is valid
    path.canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))
}

// Security: Validate file path and ensure it's a regular file
fn validate_file_path(path_str: &str) -> Result<PathBuf, String> {
    let path = validate_path(path_str)?;

    if !path.is_file() {
        return Err("Path must be a regular file".to_string());
    }

    Ok(path)
}

// Security: Validate directory path
fn validate_directory_path(path_str: &str) -> Result<PathBuf, String> {
    let path = validate_path(path_str)?;

    if !path.is_dir() {
        return Err("Path must be a directory".to_string());
    }

    Ok(path)
}

// Validate a hostname, optionally with a single leading `*.` wildcard label.
fn is_valid_domain(domain: &str) -> bool {
    let host = domain.strip_prefix("*.").unwrap_or(domain);

    if host.is_empty() || host.starts_with('.') || host.ends_with('.') {
        return false;
    }
    if !host.contains('.') {
        return false;
    }
    host.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '-')
}

// Derive a filesystem-friendly name from a domain. Leading `*.` becomes `_.`
// so shells and Java tooling don't choke on the asterisk.
fn filename_for(domain: &str) -> String {
    match domain.strip_prefix("*.") {
        Some(rest) => format!("_.{}", rest),
        None => domain.to_string(),
    }
}

#[derive(Serialize, Deserialize)]
struct CommandResult {
    success: bool,
    stdout: Option<String>,
    stderr: Option<String>,
    error: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct FileInfo {
    name: String,
    path: String,
    size: u64,
    modified: String,
}

// Execute command with separate args (NO SHELL INJECTION POSSIBLE)
#[tauri::command]
fn execute_command(args: Vec<String>) -> CommandResult {
    if args.is_empty() {
        return CommandResult {
            success: false,
            stdout: None,
            stderr: None,
            error: Some("No command provided".to_string()),
        };
    }

    let program = &args[0];
    let command_args = &args[1..];

    match Command::new(program).args(command_args).output() {
        Ok(output) => CommandResult {
            success: output.status.success(),
            stdout: Some(String::from_utf8_lossy(&output.stdout).to_string()),
            stderr: Some(String::from_utf8_lossy(&output.stderr).to_string()),
            error: None,
        },
        Err(e) => CommandResult {
            success: false,
            stdout: None,
            stderr: None,
            error: Some(e.to_string()),
        },
    }
}

// Generate CSR with secure parameters
#[tauri::command]
fn generate_csr(domain: String, output_dir: String) -> CommandResult {
    if !is_valid_domain(&domain) {
        return CommandResult {
            success: false,
            stdout: None,
            stderr: None,
            error: Some("Invalid domain. Use example.com or *.example.com".to_string()),
        };
    }

    let file_stem = filename_for(&domain);
    let key_file = format!("{}/{}.key", output_dir, file_stem);
    let csr_file = format!("{}/{}.csr", output_dir, file_stem);
    let subject = format!("/C=US/ST=Arizona/L=Tempe/O={}/OU=IT/CN={}", domain, domain);

    match Command::new("openssl")
        .args(&[
            "req",
            "-new",
            "-newkey",
            "rsa:2048",
            "-nodes",
            "-keyout",
            &key_file,
            "-out",
            &csr_file,
            "-subj",
            &subject,
        ])
        .output()
    {
        Ok(output) => CommandResult {
            success: output.status.success(),
            stdout: Some(String::from_utf8_lossy(&output.stdout).to_string()),
            stderr: Some(String::from_utf8_lossy(&output.stderr).to_string()),
            error: None,
        },
        Err(e) => CommandResult {
            success: false,
            stdout: None,
            stderr: None,
            error: Some(e.to_string()),
        },
    }
}

// Create keystore with secure command execution
#[tauri::command]
fn create_keystore(
    app: tauri::AppHandle,
    domain: String,
    output_dir: String,
    key_file: String,
    cert_file: String,
    format: String,
    extension: String,
    password: String,
    alias: String,
    legacy_mode: bool,
) -> CommandResult {
    let ca_chain_path = match get_ca_chain_path(app) {
        Ok(path) => path,
        Err(e) => {
            return CommandResult {
                success: false,
                stdout: None,
                stderr: None,
                error: Some(e),
            }
        }
    };

    let file_stem = filename_for(&domain);
    let keystore_file = format!("{}/{}.{}", output_dir, file_stem, extension);
    let temp_p12 = format!("{}/temp.p12", output_dir);

    let mut all_output = String::new();

    if format == "P12" || format == "PFX" {
        // Direct P12/PFX creation
        let mut args = vec![
            "pkcs12",
            "-export",
            "-out",
            &keystore_file,
            "-inkey",
            &key_file,
            "-in",
            &cert_file,
            "-certfile",
            &ca_chain_path,
            "-name",
            &alias,
            "-passout",
            "stdin",
        ];

        if legacy_mode {
            args.extend(&["-keypbe", "PBE-SHA1-3DES", "-certpbe", "PBE-SHA1-3DES", "-macalg", "sha1"]);
        }

        match Command::new("openssl")
            .args(&args)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
        {
            Ok(mut child) => {
                use std::io::Write;
                if let Some(mut stdin) = child.stdin.take() {
                    let _ = stdin.write_all(format!("{}\n", password).as_bytes());
                }

                match child.wait_with_output() {
                    Ok(output) => {
                        all_output.push_str(&String::from_utf8_lossy(&output.stdout));
                        if !output.status.success() {
                            return CommandResult {
                                success: false,
                                stdout: Some(all_output),
                                stderr: Some(String::from_utf8_lossy(&output.stderr).to_string()),
                                error: Some("Failed to create P12/PFX keystore".to_string()),
                            };
                        }
                    }
                    Err(e) => {
                        return CommandResult {
                            success: false,
                            stdout: None,
                            stderr: None,
                            error: Some(e.to_string()),
                        }
                    }
                }
            }
            Err(e) => {
                return CommandResult {
                    success: false,
                    stdout: None,
                    stderr: None,
                    error: Some(e.to_string()),
                }
            }
        }
    } else {
        // JKS creation (requires intermediate P12)
        // Step 1: Create temp P12
        let mut args = vec![
            "pkcs12",
            "-export",
            "-out",
            &temp_p12,
            "-inkey",
            &key_file,
            "-in",
            &cert_file,
            "-certfile",
            &ca_chain_path,
            "-name",
            &alias,
            "-passout",
            "stdin",
        ];

        if legacy_mode {
            args.extend(&["-keypbe", "PBE-SHA1-3DES", "-certpbe", "PBE-SHA1-3DES", "-macalg", "sha1"]);
        }

        match Command::new("openssl")
            .args(&args)
            .stdin(std::process::Stdio::piped())
            .spawn()
        {
            Ok(mut child) => {
                use std::io::Write;
                if let Some(mut stdin) = child.stdin.take() {
                    let _ = stdin.write_all(format!("{}\n", password).as_bytes());
                }

                match child.wait_with_output() {
                    Ok(output) => {
                        if !output.status.success() {
                            return CommandResult {
                                success: false,
                                stdout: Some(String::from_utf8_lossy(&output.stdout).to_string()),
                                stderr: Some(String::from_utf8_lossy(&output.stderr).to_string()),
                                error: Some("Failed to create intermediate P12".to_string()),
                            };
                        }
                    }
                    Err(e) => {
                        return CommandResult {
                            success: false,
                            stdout: None,
                            stderr: None,
                            error: Some(e.to_string()),
                        }
                    }
                }
            }
            Err(e) => {
                return CommandResult {
                    success: false,
                    stdout: None,
                    stderr: None,
                    error: Some(e.to_string()),
                }
            }
        }

        // Step 2: Convert P12 to JKS
        match Command::new("keytool")
            .args(&[
                "-importkeystore",
                "-noprompt",
                "-srckeystore",
                &temp_p12,
                "-srcstoretype",
                "PKCS12",
                "-destkeystore",
                &keystore_file,
                "-deststoretype",
                "JKS",
                "-srcstorepass",
                &password,
                "-deststorepass",
                &password,
            ])
            .output()
        {
            Ok(output) => {
                all_output.push_str(&String::from_utf8_lossy(&output.stdout));
                if !output.status.success() {
                    let _ = fs::remove_file(&temp_p12); // Cleanup
                    return CommandResult {
                        success: false,
                        stdout: Some(all_output),
                        stderr: Some(String::from_utf8_lossy(&output.stderr).to_string()),
                        error: Some("Failed to convert to JKS".to_string()),
                    };
                }
            }
            Err(e) => {
                let _ = fs::remove_file(&temp_p12); // Cleanup
                return CommandResult {
                    success: false,
                    stdout: None,
                    stderr: None,
                    error: Some(e.to_string()),
                }
            }
        }

        // Cleanup temp file
        let _ = fs::remove_file(&temp_p12);
    }

    // Verify keystore
    match Command::new("keytool")
        .args(&[
            "-list",
            "-v",
            "-keystore",
            &keystore_file,
            "-storepass",
            &password,
        ])
        .output()
    {
        Ok(output) => {
            all_output.push_str("\n\nVerification:\n");
            all_output.push_str(&String::from_utf8_lossy(&output.stdout));

            CommandResult {
                success: true,
                stdout: Some(all_output),
                stderr: None,
                error: None,
            }
        }
        Err(e) => CommandResult {
            success: false,
            stdout: Some(all_output),
            stderr: None,
            error: Some(format!("Keystore created but verification failed: {}", e)),
        },
    }
}

#[tauri::command]
fn file_exists(file_path: String) -> bool {
    // Basic safety checks only — don't canonicalize, because that fails for
    // files that don't exist yet (defeating the purpose of an existence check)
    // and races with filesystem caches immediately after a write.
    if file_path.contains("..") {
        return false;
    }
    let path = PathBuf::from(&file_path);
    if !path.is_absolute() {
        return false;
    }
    path.exists()
}

#[tauri::command]
fn get_ca_chain_path(app: tauri::AppHandle) -> Result<String, String> {
    // In development, use resources folder from repo
    // In production, use bundled resources
    let ca_chain = if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("resources")
            .join("ca-chains")
            .join("gd_bundle-g2-g1.crt")
    } else {
        app.path()
            .resource_dir()
            .map_err(|e: tauri::Error| e.to_string())?
            .join("_up_")
            .join("resources")
            .join("ca-chains")
            .join("gd_bundle-g2-g1.crt")
    };

    ca_chain
        .to_str()
        .map(|s: &str| s.to_string())
        .ok_or_else(|| "Invalid CA chain path".to_string())
}

#[tauri::command]
fn read_file(file_path: String) -> Result<String, String> {
    // Security: Validate path and ensure it's a regular file
    let path = validate_file_path(&file_path)?;

    // Security: Check file size to prevent reading huge files
    const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10MB
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    if metadata.len() > MAX_FILE_SIZE {
        return Err("File too large (max 10MB)".to_string());
    }

    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(file_path: String, content: String) -> Result<(), String> {
    // Security: Basic path validation for new files
    if file_path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let path = PathBuf::from(&file_path);
    if !path.is_absolute() {
        return Err("Only absolute paths are allowed".to_string());
    }

    // Security: Check content size
    const MAX_CONTENT_SIZE: usize = 10 * 1024 * 1024; // 10MB
    if content.len() > MAX_CONTENT_SIZE {
        return Err("Content too large (max 10MB)".to_string());
    }

    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_files(dir_path: String, extensions: Vec<String>) -> Result<Vec<FileInfo>, String> {
    // Security: Validate directory path
    let dir = validate_directory_path(&dir_path)?;

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;

    let mut files = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_file() {
            if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                if extensions.iter().any(|ext| file_name.ends_with(ext)) {
                    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
                    let modified = metadata
                        .modified()
                        .unwrap_or(SystemTime::UNIX_EPOCH)
                        .duration_since(SystemTime::UNIX_EPOCH)
                        .map(|d| {
                            chrono::DateTime::from_timestamp(d.as_secs() as i64, 0)
                                .unwrap_or_default()
                                .to_rfc3339()
                        })
                        .unwrap_or_else(|_| "Unknown".to_string());

                    files.push(FileInfo {
                        name: file_name.to_string(),
                        path: path.to_str().unwrap_or("").to_string(),
                        size: metadata.len(),
                        modified,
                    });
                }
            }
        }
    }

    Ok(files)
}

#[tauri::command]
fn delete_file(file_path: String) -> Result<(), String> {
    // Security: Validate path and ensure it's a regular file
    let path = validate_file_path(&file_path)?;

    // Security: Additional safety - only allow deletion of certificate/key files
    let extension = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let allowed_extensions = ["key", "csr", "crt", "pem", "p12", "pfx", "jks"];
    if !allowed_extensions.contains(&extension) {
        return Err("Can only delete certificate/key files".to_string());
    }

    fs::remove_file(path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            execute_command,
            generate_csr,
            create_keystore,
            file_exists,
            get_ca_chain_path,
            read_file,
            write_file,
            list_files,
            delete_file,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_plain_domain() {
        assert!(is_valid_domain("example.com"));
        assert!(is_valid_domain("www.example.com"));
        assert!(is_valid_domain("a-b.c-d.example.com"));
    }

    #[test]
    fn accepts_leading_wildcard() {
        assert!(is_valid_domain("*.example.com"));
        assert!(is_valid_domain("*.foo.example.com"));
    }

    #[test]
    fn rejects_bad_wildcards() {
        assert!(!is_valid_domain("*"));
        assert!(!is_valid_domain("*."));
        assert!(!is_valid_domain("*foo.com"));
        assert!(!is_valid_domain("foo.*.com"));
        assert!(!is_valid_domain("**.com"));
    }

    #[test]
    fn rejects_malformed() {
        assert!(!is_valid_domain(""));
        assert!(!is_valid_domain("localhost"));
        assert!(!is_valid_domain("*.localhost"));
        assert!(!is_valid_domain(".example.com"));
        assert!(!is_valid_domain("example.com."));
        assert!(!is_valid_domain("..com"));
        assert!(!is_valid_domain("foo bar.com"));
        assert!(!is_valid_domain("foo/bar.com"));
    }

    #[test]
    fn filename_for_plain_domain_unchanged() {
        assert_eq!(filename_for("example.com"), "example.com");
        assert_eq!(filename_for("www.example.com"), "www.example.com");
    }

    #[test]
    fn filename_for_wildcard_rewrites_leading_star() {
        assert_eq!(filename_for("*.example.com"), "_.example.com");
        assert_eq!(filename_for("*.foo.example.com"), "_.foo.example.com");
    }

    #[test]
    fn filename_for_only_rewrites_leading_star() {
        // Defense-in-depth: non-leading `*` is rejected by validator, but
        // the transform itself must never touch anything past the first label.
        assert_eq!(filename_for("foo.*.com"), "foo.*.com");
    }
}
