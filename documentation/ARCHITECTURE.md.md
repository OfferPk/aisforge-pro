# AISForge Pro: Technical Architecture & Maritime Navigation Protocol Specification

## Executive Overview

**AISForge Pro** is an industrial-grade DevSecOps maritime navigation protocol engineering studio, bitstream codec, NMEA 2000 CAN bus synthesizer, and cyber resilience auditing platform for the ITU-R M.1371-5 Automatic Identification System (AIS) and IEC 61162 series standards.

AIS is the globally mandated maritime collision avoidance and tracking standard, mandatory under IMO SOLAS (Safety of Life at Sea) Chapter V, Regulation 19 for all passenger vessels, all commercial cargo ships \$\\ge 300\$ gross tonnage on international voyages, and all domestic cargo ships \$\\ge 500\$ GT.

AISForge Pro addresses the growing geopolitical and commercial crisis of maritime GPS/AIS spoofing, phantom ghost vessels, and navigation telemetry injection across major global trade corridors (such as the Persian Gulf, Red Sea, Strait of Hormuz, Malacca Strait, and North Sea).

---

## 1\. Protocol Architecture & Standards Reference

\+-----------------------------------------------------------------------------------+

|                        Maritime Bridge & Transponder Network                      |

\+-----------------------------------------------------------------------------------+

|  VHF Transceiver / AIS Transponder                   ECDIS / Radar Navigation Hub  |

|  \+------------------------+                          \+--------------------------+ |

|  | ITU-R M.1371 SOTDMA/TDMA|  RS-422 / Serial 38.4k   | Marine Navigation System | |

|  | \- Ch A (161.975 MHz)   | \<======================\> | \- NMEA 0183 AIVDM/AIVDO  | |

|  | \- Ch B (162.025 MHz)   |  UDP Port 10110 (Ether)  | \- IEC 61162-450 Gateway  | |

|  | \- 6-Bit ASCII Armoring |  NMEA 2000 CAN Bus       | \- ARPA Radar Target Plot | |

|  \+------------------------+                          \+--------------------------+ |

\+-----------------------------------------------------------------------------------+

### Supported Standards

- **ITU-R M.1371-5**: Technical characteristics for an automatic identification system using time division multiple access (SOTDMA / CSTDMA) in the VHF maritime mobile band.  
- **IEC 61162-1 / NMEA 0183 (v4.20)**: Single-talker maritime navigation serial communication standard; XOR checksum calculation (`*hh`).  
- **IEC 61162-3 / NMEA 2000**: Controller Area Network (CAN 2.0B) multi-drop bus protocol running at 250 kbps; PGN 129038, 129039, 129794 mapping.  
- **IEC 61162-450 (Lightweight Ethernet)**: High-speed Ethernet transport for shipboard navigation networks (UDP port 10110 multicast).  
- **IMO Resolution MSC.428(98)**: Mandatory maritime cyber risk management incorporated into shipboard Safety Management Systems (SMS).  
- **IACS Unified Requirements UR E26 & UR E27**: Cyber resilience of newbuild and operating commercial vessels.

---

## 2\. NMEA 0183 AIVDM Sentence Structure & 6-Bit ASCII Armoring

\!AIVDM,count,fragment,seq\_id,channel,payload,fill\_bits\*hh

  │      │     │        │       │       │       │     └─ 2-digit Hex XOR Checksum

  │      │     │        │       │       │       └─────── Number of padding bits (0..5)

  │      │     │        │       │       └─────────────── 6-Bit ASCII Armored Payload

  │      │     │        │       └─────────────────────── VHF Radio Channel (A or B)

  │      │     │        └─────────────────────────────── Multi-sentence sequence ID

  │      │     └──────────────────────────────────────── Sentence fragment number (1-based)

  │      └────────────────────────────────────────────── Total fragments in message

  └───────────────────────────────────────────────────── Sentence Talker & Formatter Identifier

### 6-Bit ASCII Transformation Algorithm

AIS payloads are serialized as continuous bitstreams, partitioned into 6-bit symbols (\$0..63\$). Each 6-bit symbol is translated into a printable ASCII character using the following rule:

- If symbol value \$v \< 40\$: ASCII character code \= \$v \+ 48\$ (`0` through `W`)  
- If symbol value \$v \\ge 40\$: ASCII character code \= \$v \+ 56\$ (`` ` `` through `w`)

### NMEA 0183 XOR Checksum Formula

\$\$	ext{Checksum} \= igoplus\_{i=	ext{start}}^{	ext{end}} 	ext{ASCII}(S\[i\])\$\$ where the XOR sum spans all characters strictly between `!` (or `$`) and `*`.

---

## 3\. Supported Message Types

1. **Type 1, 2, 3: Class A Position Report (168 Bits)**:  
   - Position accuracy, 28-bit signed Longitude (\$1/10000\$ min), 27-bit signed Latitude (\$1/10000\$ min), 10-bit Speed Over Ground (SOG in \$0.1	ext{ kts}\$), 12-bit Course Over Ground (COG in \$0.1^\\circ\$), 9-bit True Heading, 4-bit Navigational Status, 8-bit Rate of Turn (ROT), and SOTDMA communication status.  
2. **Type 4: Base Station Report (168 Bits)**:  
   - UTC timestamp, base station coordinates, position accuracy, and RAIM status.  
3. **Type 5: Static and Voyage Related Data (424 Bits, 2-Part Multi-sentence)**:  
   - MMSI, IMO number, 7-character Call Sign, 20-character Vessel Name, Ship Type, Vessel Dimensions, EPFD type, ETA, 8-bit Draught (\$0.1	ext{ m}\$), and 20-character Destination string.  
4. **Type 18: Standard Class B Equipment Position Report (168 Bits)**:  
   - Autonomous SOG, position, COG, and CS unit flags for recreational and commercial fishing vessels.

---

## 4\. 10-Point IMO SOLAS & IACS UR E26 Maritime Cybersecurity Matrix

| ID | Vector | Criticality | Standard | Verification Metric |
| :---- | :---- | :---- | :---- | :---- |
| **V1** | Velocity Teleportation & Spoofing | CRITICAL | IMO MSC.428(98) | SOG \$\\le 45	ext{ kts}\$ for commercial tankers; physical coordinate bounds checked. |
| **V2** | MMSI Authenticity & Flag State | CRITICAL | ITU-R M.585 | 9-digit MMSI allocated under recognized sovereign MID (\$200..775\$). |
| **V3** | NMEA 0183 Checksum Mode | HIGH | IEC 61162-1 | Strict XOR checksum verification active; unverified lines dropped. |
| **V4** | Ghost Vessel Duplicate Defense | HIGH | IACS UR E26 | Spatial tracking checks for duplicate MMSI conflict collisions. |
| **V5** | Nav Status & Kinematic Consistency | HIGH | ITU-R M.1371 | SOG \$\\le 3	ext{ kts}\$ when status is "At anchor" or "Moored". |
| **V6** | RAIM Fault Monitoring | MEDIUM | IEC 61108-1 | Receiver Autonomous Integrity Monitoring active on GNSS sensor. |
| **V7** | Rate of Turn (ROT) Limits | HIGH | IEC 61993-2 | Hydrodynamic limits verified (\$\\le 720^\\circ/	ext{min}\$). |
| **V8** | Static & Voyage Destination | MEDIUM | IMO SN/Circ.243 | Destination UN/LOCODE populated and verified against port databases. |
| **V9** | ECDIS Bridge Network Isolation | HIGH | IEC 61162-450 | Dedicated navigation VLAN with firewall isolating UDP 10110\. |
| **V10** | Suricata Layer 7 Maritime IDS | HIGH | MITRE Maritime | Deep Packet Inspection rules active for spoofing & broadcast storm mitigation. |

