use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::oneshot;

/// Result of the OAuth callback
#[derive(Debug, Clone, serde::Serialize)]
pub struct OAuthCallbackResult {
    pub code: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

/// Start the OAuth callback server and return the port
#[tauri::command]
pub async fn start_oauth_server() -> Result<u16, String> {
    // Find an available port
    let port = portpicker::pick_unused_port().ok_or("No available port found")?;
    Ok(port)
}

/// Wait for the OAuth callback on the specified port
/// Returns the authorization code or error
#[tauri::command]
pub async fn wait_for_oauth_callback(port: u16, timeout_secs: u64) -> Result<OAuthCallbackResult, String> {
    let addr = format!("127.0.0.1:{}", port);

    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("Failed to bind to {}: {}", addr, e))?;

    log::info!("OAuth callback server listening on {}", addr);

    // Create a channel to signal completion
    let (tx, rx) = oneshot::channel::<OAuthCallbackResult>();
    let tx = Arc::new(tokio::sync::Mutex::new(Some(tx)));

    // Spawn a task to handle the connection
    let tx_clone = Arc::clone(&tx);
    let handle = tokio::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((mut socket, _)) => {
                    // Read the HTTP request
                    let mut buffer = vec![0u8; 4096];
                    let n = match socket.read(&mut buffer).await {
                        Ok(n) => n,
                        Err(e) => {
                            log::error!("Failed to read from socket: {}", e);
                            continue;
                        }
                    };

                    let request = String::from_utf8_lossy(&buffer[..n]);
                    log::debug!("Received OAuth callback request: {}", request);

                    // Parse the request to extract the path and query string
                    let result = parse_oauth_callback(&request);

                    // Send HTML response
                    let (status, body) = if result.code.is_some() {
                        ("200 OK", get_success_html())
                    } else {
                        ("400 Bad Request", get_error_html(result.error.as_deref().unwrap_or("Unknown error")))
                    };

                    let response = format!(
                        "HTTP/1.1 {}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                        status,
                        body.len(),
                        body
                    );

                    if let Err(e) = socket.write_all(response.as_bytes()).await {
                        log::error!("Failed to write response: {}", e);
                    }
                    let _ = socket.shutdown().await;

                    // Send result and exit
                    if let Some(tx) = tx_clone.lock().await.take() {
                        let _ = tx.send(result);
                    }
                    break;
                }
                Err(e) => {
                    log::error!("Failed to accept connection: {}", e);
                }
            }
        }
    });

    // Wait for result with timeout
    let timeout = tokio::time::Duration::from_secs(timeout_secs);
    match tokio::time::timeout(timeout, rx).await {
        Ok(Ok(result)) => {
            handle.abort();
            Ok(result)
        }
        Ok(Err(_)) => {
            handle.abort();
            Err("OAuth callback channel closed unexpectedly".to_string())
        }
        Err(_) => {
            handle.abort();
            Err(format!("OAuth callback timed out after {} seconds", timeout_secs))
        }
    }
}

/// Parse the OAuth callback request and extract code or error
fn parse_oauth_callback(request: &str) -> OAuthCallbackResult {
    // Extract the first line (GET /callback?... HTTP/1.1)
    let first_line = request.lines().next().unwrap_or("");

    // Extract the path with query string
    let parts: Vec<&str> = first_line.split_whitespace().collect();
    if parts.len() < 2 {
        return OAuthCallbackResult {
            code: None,
            error: Some("Invalid HTTP request".to_string()),
            error_description: None,
        };
    }

    let path = parts[1];

    // Parse query string
    if let Some(query_start) = path.find('?') {
        let query = &path[query_start + 1..];
        let params: std::collections::HashMap<&str, &str> = query
            .split('&')
            .filter_map(|pair| {
                let mut parts = pair.splitn(2, '=');
                Some((parts.next()?, parts.next().unwrap_or("")))
            })
            .collect();

        // URL decode the values
        let code = params.get("code").map(|s| urlencoding_decode(s));
        let error = params.get("error").map(|s| urlencoding_decode(s));
        let error_description = params.get("error_description").map(|s| urlencoding_decode(s));

        OAuthCallbackResult {
            code,
            error,
            error_description,
        }
    } else {
        OAuthCallbackResult {
            code: None,
            error: Some("No query parameters in callback".to_string()),
            error_description: None,
        }
    }
}

/// Simple URL decoding (handles %XX encoding)
fn urlencoding_decode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if hex.len() == 2 {
                if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                    result.push(byte as char);
                    continue;
                }
            }
            result.push('%');
            result.push_str(&hex);
        } else if c == '+' {
            result.push(' ');
        } else {
            result.push(c);
        }
    }

    result
}

/// HTML page shown on successful authentication
fn get_success_html() -> String {
    r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Authentication Successful</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }
        .container {
            text-align: center;
            padding: 48px;
            background: rgba(255,255,255,0.05);
            border-radius: 24px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .icon {
            width: 80px;
            height: 80px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 40px;
        }
        h1 { font-size: 24px; margin-bottom: 12px; font-weight: 600; }
        p { color: rgba(255,255,255,0.7); font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✓</div>
        <h1>Authentication Successful</h1>
        <p>You can close this window and return to Apigee Workbench.</p>
    </div>
</body>
</html>"#.to_string()
}

/// HTML page shown on authentication error
fn get_error_html(error: &str) -> String {
    format!(r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Authentication Failed</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }}
        .container {{
            text-align: center;
            padding: 48px;
            background: rgba(255,255,255,0.05);
            border-radius: 24px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }}
        .icon {{
            width: 80px;
            height: 80px;
            background: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 40px;
        }}
        h1 {{ font-size: 24px; margin-bottom: 12px; font-weight: 600; }}
        p {{ color: rgba(255,255,255,0.7); font-size: 14px; }}
        .error {{ color: #fca5a5; margin-top: 16px; font-family: monospace; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✕</div>
        <h1>Authentication Failed</h1>
        <p>Please close this window and try again.</p>
        <p class="error">{}</p>
    </div>
</body>
</html>"#, error)
}
