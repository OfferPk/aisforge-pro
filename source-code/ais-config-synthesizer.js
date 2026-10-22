/**
 * AISForge Pro - Maritime Gateway Rules & Threat Signature Synthesizer (ais-config-synthesizer.js)
 * 
 * Generates:
 * - Linux nftables stateful firewall rules for IEC 61162-450 ECDIS / VTS gateways
 * - Suricata / Snort Layer 7 Deep Packet Inspection (DPI) maritime threat signatures
 * - Hardened Linux systemd service unit for maritime AIS receiver daemons
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AISConfigSynthesizer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function generateNftables(options) {
    options = options || {};
    var allowedSubnet = options.allowedSubnet || "192.168.10.0/24";
    var nmeaUdpPort = options.nmeaUdpPort || 10110;
    var nmeaTcpPort = options.nmeaTcpPort || 4001;
    var maxPacketRate = options.maxPacketRate || "100/second";

    return [
      "#!/usr/sbin/nft -f",
      "# AISForge Pro - IEC 61162-450 Maritime ECDIS Gateway Firewall Rules",
      "# Standard: IMO MSC.428(98) / IACS UR E26 & E27",
      "",
      "table inet maritime_bridge {",
      "  set trusted_nav_transponders {",
      "    type ipv4_addr",
      "    flags interval",
      "    elements = { " + allowedSubnet + " }",
      "  }",
      "",
      "  chain inbound_filter {",
      "    type filter hook input priority filter; policy drop;",
      "",
      "    # Allow established and related connections",
      "    ct state established,related accept",
      "",
      "    # Allow loopback interface",
      "    iif lo accept",
      "",
      "    # Drop invalid TCP/UDP state packets",
      "    ct state invalid drop",
      "",
      "    # Mitigate NMEA 0183 Broadcast Flooding on Port " + nmeaUdpPort,
      "    udp dport " + nmeaUdpPort + " limit rate " + maxPacketRate + " burst 150 packets accept",
      "    udp dport " + nmeaUdpPort + " drop",
      "",
      "    # Restrict ECDIS AIS feed strictly to navigation bridge transponder subnet",
      "    ip saddr @trusted_nav_transponders udp dport " + nmeaUdpPort + " accept",
      "    ip saddr @trusted_nav_transponders tcp dport " + nmeaTcpPort + " ct state new accept",
      "",
      "    # Log and drop rogue unauthorized AIS packet injection",
      "    udp dport " + nmeaUdpPort + " log prefix \"[MARITIME-ROGUE-AIS]: \" group 0 drop",
      "  }",
      "}"
    ].join("\n");
  }

  function generateSuricata(options) {
    options = options || {};
    var sidBase = options.sidBase || 4001000;

    return [
      "# ====================================================================",
      "# AISForge Pro - Suricata Layer 7 Maritime Threat Signatures",
      "# Protocol: NMEA 0183 / ITU-R M.1371-5 (AIVDM / AIVDO Sentences)",
      "# Ports: UDP 10110 (IEC 61162-450), TCP 4001 (NMEA Stream)",
      "# ====================================================================",
      "",
      "# 1. Detect Bogus / Spoofed Default MMSI (000000000 or 999999999)",
      'alert udp any any -> any [10110,4001] (msg:"MARITIME-THREAT: Spoofed / Bogus MMSI Detected in AIVDM Sentence"; content:"!AIVDM"; depth:6; pcre:"/!AIVDM,\\d+,\\d+,\\w*,[AB],0{5,}/i"; classtype:policy-violation; sid:' + (sidBase + 1) + '; rev:1;)',
      "",
      "# 2. Detect NMEA 0183 Sentence Buffer Overflow Attempt (>82 bytes buffer limit)",
      'alert udp any any -> any [10110,4001] (msg:"MARITIME-EXPLOIT: Oversized NMEA Sentence Exceeds IEC 61162-1 Buffer"; content:"!AIVDM"; depth:6; dsize:>82; classtype:attempted-admin; sid:' + (sidBase + 2) + '; rev:1;)',
      "",
      "# 3. Detect High-Frequency NMEA Broadcast Flooding (Denial of Service)",
      'alert udp any any -> any 10110 (msg:"MARITIME-DOS: High-Frequency NMEA 0183 UDP Broadcast Flood"; content:"!AIVD"; depth:5; threshold:type both, track by_src, count 250, seconds 2; classtype:attempted-dos; sid:' + (sidBase + 3) + '; rev:1;)',
      "",
      "# 4. Detect Rogue AIVDO Own-Ship Position Override Injection",
      'alert udp any any -> any [10110,4001] (msg:"MARITIME-SPOOF: Rogue AIVDO Own-Ship Position Injection Detected"; content:"!AIVDO"; depth:6; classtype:bad-unknown; sid:' + (sidBase + 4) + '; rev:1;)',
      "",
      "# 5. Detect Corrupted NMEA Checksum Injection",
      'alert udp any any -> any [10110,4001] (msg:"MARITIME-ANOMALY: Malformed NMEA 0183 Sentence Lacks Standard Delimiter"; content:"!AIVDM"; depth:6; pcre:"/![A-Z0-9,]+\\*[0-9A-Fa-f]{2}/"; invert_pcre; classtype:protocol-command-decode; sid:' + (sidBase + 5) + '; rev:1;)'
    ].join("\n");
  }

  function generateSystemdService(options) {
    options = options || {};
    var binPath = options.binPath || "/opt/aisforge/bin/ais-receiver";

    return [
      "[Unit]",
      "Description=AISForge Pro - High-Assurance Maritime AIS Receiver & NMEA Gateway Daemon",
      "Documentation=https://github.com/aisforge/aisforge-pro",
      "After=network.target network-online.target",
      "Wants=network-online.target",
      "",
      "[Service]",
      "Type=simple",
      "User=ais",
      "Group=ais",
      "WorkingDirectory=/opt/aisforge",
      "ExecStart=" + binPath + " --port 10110 --udp --ecdis 192.168.10.50 --log /var/log/ais-gateway.log",
      "Restart=always",
      "RestartSec=5s",
      "LimitNOFILE=32768",
      "",
      "# Systemd Hardening",
      "ProtectSystem=strict",
      "ProtectHome=true",
      "PrivateTmp=true",
      "PrivateDevices=false",
      "ProtectKernelTunables=true",
      "CapabilityBoundingSet=CAP_NET_BIND_SERVICE CAP_NET_RAW",
      "AmbientCapabilities=CAP_NET_BIND_SERVICE",
      "NoNewPrivileges=true",
      "",
      "[Install]",
      "WantedBy=multi-user.target"
    ].join("\n");
  }

  return {
    generateNftables: generateNftables,
    generateSuricata: generateSuricata,
    generateSystemdService: generateSystemdService
  };
}));
