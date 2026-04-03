use serde::Serialize;
use std::net::UdpSocket;
use std::process::Command;

#[derive(Clone, Serialize)]
pub struct NetworkInfo {
    pub hostname: String,
    pub local_ip: String,
}

pub fn get_network_info() -> NetworkInfo {
    let hostname = Command::new("hostname")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    // Connect to a public DNS to discover the preferred local IP.
    let local_ip = UdpSocket::bind("0.0.0.0:0")
        .and_then(|s| {
            s.connect("8.8.8.8:80")?;
            s.local_addr()
        })
        .map(|a| a.ip().to_string())
        .unwrap_or_default();

    NetworkInfo {
        hostname,
        local_ip,
    }
}
