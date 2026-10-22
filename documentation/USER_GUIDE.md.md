# AISForge Pro: Comprehensive Operations Manual & CLI Reference

## 1\. Quick Start

### Web Studio (Zero-Dependency Single-Page App)

Launch `source-code/index.html` in any web browser. Runs 100% locally with zero external network connectivity or cloud dependencies.

### Standalone Python CLI (`aisforge-cli.py`)

Ensure Python 3.8+ is installed.

\# Make executable

chmod \+x build/aisforge-cli.py

\# Display global options

python3 build/aisforge-cli.py \--help

---

## 2\. CLI Command Inventory

### `build-packet` — Synthesize AIVDM NMEA 0183 Sentences

\# Synthesize Type 1 Class A Position Report for Dubai Jebel Ali Port tanker

python3 build/aisforge-cli.py build-packet \--type 1 \--mmsi 470123456 \--lat 25.0120 \--lon 55.0270 \--sog 14.5 \--cog 315.0 \--heading 314

\# Synthesize Type 5 Static and Voyage Related Data (2-part sentence)

python3 build/aisforge-cli.py build-packet \--type 5 \--mmsi 470123456 \--name "GULF PRIDE DUBAI" \--callsign "A6E991" \--dest "AE JEA (JEBEL ALI)"

### `dissect` — Dissect Raw AIVDM Sentences

python3 build/aisforge-cli.py dissect \--sentence "\!AIVDM,1,1,,A,170F3h002ASsq\<@\>Cup\<Cam622e5,0\*3E"

### `armor` — 6-Bit ASCII Armoring Bitstream Codec

python3 build/aisforge-cli.py armor \--text "EVER GIVEN"

### `synth-n2k` — NMEA 2000 CAN Bus PGN Synthesizer

python3 build/aisforge-cli.py synth-n2k \--pgn 129038 \--mmsi 470123456

### `audit` — 10-Point IMO SOLAS / IACS UR E26 Cybersecurity Auditor

\# Run baseline compliance audit

python3 build/aisforge-cli.py audit

\# Run strict CI/CD pipeline gate (exit code 1 on non-compliance)

python3 build/aisforge-cli.py audit \--strict \--profile vessel\_profile.json

### `export-pcap` — Wireshark Libpcap 2.4 Trace Generator

python3 build/aisforge-cli.py export-pcap \--out maritime-ais.pcap

### `synth-config` — Firewall Rules & Suricata Signatures

\# Generate Linux nftables rules

python3 build/aisforge-cli.py synth-config \--type nftables

\# Generate Suricata Layer 7 maritime threat signatures

python3 build/aisforge-cli.py synth-config \--type suricata

\# Generate hardened systemd service unit

python3 build/aisforge-cli.py synth-config \--type systemd