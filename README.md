# AISForge Pro (v1.0.0)

> **ITU-R M.1371-5 AIS (Automatic Identification System) & NMEA 0183/2000 Maritime Navigation Protocol Studio, AIVDM/AIVDO 6-Bit ASCII Bitstream Encoder/Decoder, N2K CAN Bus PGN Synthesizer & IMO SOLAS / IACS UR E26 Maritime Cybersecurity Auditor**

---

## ⚡ Executive Overview

**AISForge Pro** is an industrial-grade DevSecOps maritime navigation protocol engineering workbench, bitstream codec, NMEA 2000 CAN bus synthesizer, and cyber resilience auditing platform for the ITU-R M.1371-5 Automatic Identification System (AIS) and IEC 61162 standards.

Over 80% of global commerce moves via maritime shipping. Commercial vessels, mega-ports (Port of Dubai / Jebel Ali, Singapore, Rotterdam, Houston), and Vessel Traffic Services (VTS) centers face unprecedented navigation hazards due to GPS/AIS spoofing, phantom ghost vessels, and unauthenticated NMEA 0183 injection attacks in high-risk straits and conflict corridors.

AISForge Pro provides an all-in-one studio to synthesize, dissect, validate, and audit maritime AIS communication streams across serial, Ethernet (IEC 61162-450 UDP port 10110), and CAN bus (NMEA 2000\) layers.

---

## 🚀 Key Features

1. **ITU-R M.1371-5 & NMEA 0183 Protocol Engine**:  
   - Synthesizes and dissects byte-accurate AIVDM and AIVDO sentences with automatic XOR checksum (`*hh`) calculation.  
   - Implements full 6-bit ASCII armoring bitstream packing and unpacking.  
   - Comprehensive message type support:  
     - **Type 1, 2, 3**: Class A Position Report (168 bits: Lat/Lon, SOG, COG, Heading, Nav Status, ROT, RAIM).  
     - **Type 4**: Base Station Report.  
     - **Type 5**: Static and Voyage Related Data (424 bits, multi-sentence 2-part fragmentation).  
     - **Type 18**: Standard Class B Position Report.  
2. **NMEA 2000 (IEC 61162-3) CAN Bus Engine**:  
   - Translates AIS messages into 29-bit Extended CAN Identifiers and PGN payloads:  
     - PGN 129038: AIS Class A Position Report  
     - PGN 129039: AIS Class B Position Report  
     - PGN 129794: AIS Class A Static and Voyage Data  
3. **10-Point IMO SOLAS & IACS UR E26/E27 Cybersecurity Auditor**:  
   - Automated evaluation matrix covering velocity teleportation detection (SOG \$\> 45	ext{ kts}\$ for commercial tankers), sovereign MMSI / MID validation, strict checksum enforcement, ghost vessel duplicate detection, nav status kinematic consistency, and bridge Ethernet VLAN isolation.  
   - Built-in `--strict` CI/CD gating flag for automated maritime software deployment pipelines.  
4. **DevSecOps Gateway & IDS Config Synthesizer**:  
   - Auto-generates Linux `nftables` stateful firewall rules for IEC 61162-450 ECDIS navigation bridges.  
   - Generates Suricata / Snort Layer 7 Deep Packet Inspection (DPI) maritime threat detection signatures.  
   - Generates hardened `systemd` service units for edge AIS SDR receiver daemons.  
5. **Wireshark Libpcap 2.4 Exporter**:  
   - Exports authentic `.pcap` capture files containing NMEA 0183 sentences encapsulated in UDP packets on port 10110 with valid IPv4 checksums.

---

## 📂 Repository Structure

├── README.md                                  \# Product overview & quick start

├── build/

│   ├── aisforge-cli.py                        \# Standalone Python CLI utility

│   └── aisforge-pro-v1.0.0.zip                \# Complete release distribution

├── documentation/

│   ├── ARCHITECTURE.md                        \# Technical & protocol specification

│   ├── USER\_GUIDE.md                          \# Operations manual & CLI reference

│   └── MONETIZATION\_AND\_MARKETING\_PLAYBOOK.md \# Commercial strategy, pricing tiers & GTM

├── screenshots/

│   ├── ais-studio-preview.svg                 \# Web Studio ECDIS / VTS dark-theme UI diagram

│   └── ais-architecture-diagram.svg           \# Maritime navigation architecture & threat diagram

└── source-code/

    ├── index.html                             \# Multi-tab Web Studio user interface

    ├── ais-forge.css                          \# Maritime ECDIS radar dark theme styling

    ├── ais-protocol-engine.js                 \# Core ITU-R M.1371, NMEA 0183 & N2K CAN engine

    ├── ais-security-auditor.js                \# 10-point IMO SOLAS & IACS UR E26 compliance auditor

    ├── ais-config-synthesizer.js              \# Linux nftables & Suricata signature generator

    └── app.js                                 \# Application controller & VTS radar simulator

---

## 🛠️ Usage

### 1\. Web Studio (Zero-Dependency)

Open `source-code/index.html` in any modern web browser.

### 2\. Standalone Python CLI

\# Make CLI executable

chmod \+x build/aisforge-cli.py

\# Synthesize a Class A Position Report for Dubai Jebel Ali Port tanker

python3 build/aisforge-cli.py build-packet \--type 1 \--mmsi 470123456 \--lat 25.0120 \--lon 55.0270 \--sog 14.5 \--cog 315.0

\# Synthesize multi-part Type 5 Static and Voyage Data

python3 build/aisforge-cli.py build-packet \--type 5 \--mmsi 470123456 \--name "GULF PRIDE DUBAI" \--dest "AE JEA (JEBEL ALI)"

\# Dissect raw NMEA AIVDM sentence

python3 build/aisforge-cli.py dissect \--sentence "\!AIVDM,1,1,,A,170F3h002ASsq\<@\>Cup\<Cam622e5,0\*3E"

\# Encode text into 6-bit armored ASCII

python3 build/aisforge-cli.py armor \--text "EVER GIVEN"

\# Synthesize NMEA 2000 CAN Bus PGN frame

python3 build/aisforge-cli.py synth-n2k \--pgn 129038 \--mmsi 470123456

\# Run IMO SOLAS maritime cybersecurity audit

python3 build/aisforge-cli.py audit \--strict

\# Export Wireshark PCAP trace

python3 build/aisforge-cli.py export-pcap \--out ais-nmea-trace.pcap

\# Synthesize Linux nftables bridge rules

python3 build/aisforge-cli.py synth-config \--type nftables

---

## 🔒 Verification & Compliance

- **ITU-R M.1371-5** (Technical characteristics for an automatic identification system)  
- **IEC 61162-1** (NMEA 0183\) & **IEC 61162-3** (NMEA 2000 CAN)  
- **IEC 61162-450** (Lightweight Ethernet)  
- **IMO Resolution MSC.428(98)** & **IACS UR E26 / E27**  
- **10-Vector Automated Test Suite**: 100% Pass Rate