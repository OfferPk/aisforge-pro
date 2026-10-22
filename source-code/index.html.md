  
⚓  
AISForge Pro  
ITU-R M.1371-5 & NMEA 0183/2000 Maritime Protocol Studio & IMO SOLAS Auditor  
UDP 10110 / N2K CAN IMO MSC.428(98) AUDITED  
AIVDM Synthesizer AIVDM Dissector 6-Bit ASCII Codec NMEA 2000 CAN Engine IMO / IACS Auditor ECDIS Gateway & IDS VTS Radar Simulator

AIS Message Configuration ITU-R M.1371-5  
Synthesize byte-accurate NMEA 0183 AIVDM sentences with XOR checksums.  
Message Type Type 1: Class A Position Report (168 bits) Type 5: Static and Voyage Related Data (424 bits, 2-part)

MMSI (9 Digits)  
VHF Channel AIS Channel A (161.975 MHz) AIS Channel B (162.025 MHz)

Latitude (DD.DDDD)  
Longitude (DD.DDDD)

SOG (Knots)  
COG (Degrees)  
Heading (Deg)  
Navigational Status 0 \- Under way using engine 1 \- At anchor 2 \- Not under command 5 \- Moored 8 \- Under way sailing

Vessel Name (Max 20 chars)  
Call Sign (Max 7 chars)

IMO Number (7 Digits)  
Ship Type 80 \- Tanker (Oil/Chemical) 70 \- Cargo Vessel 60 \- Passenger Vessel 52 \- Tug  
Destination (UN/LOCODE or Port)  
Synthesize AIVDM Sentence Export Wireshark PCAP Preset: Dubai Oil Tanker Preset: UK Felixstowe Container

Synthesized NMEA 0183 AIVDM Output Valid Checksum  
Standard Marine VHF 38.4 kbps sentence ready for serial / UDP broadcast.  
\!AIVDM,1,1,,A,...\*hh  
AIS Payload Telemetry & Position Fix

Sentence Type:Type 1 (Class A Position)  
MMSI Flag State:470 (United Arab Emirates)  
Coordinates:25.0120° N, 55.0270° E  
Speed & Course:14.5 kts @ 315.0° COG  
True Heading:314°  
NMEA 0183 Checksum:Valid XOR (\*hh)

Raw NMEA 0183 / AIVDM Stream  
Paste single-frame or multi-part AIVDM sentences captured from marine VHF receivers.  
Dissect AIVDM Stream Load Sample Type 1 Load Sample Type 5 (2-Part)

Decoded Marine Telemetry Tree  
Decoded navigational attributes, vessel identifiers, and payload bits.  
*Paste valid NMEA AIVDM sentences on the left and click 'Dissect AIVDM Stream'.*

6-Bit ASCII Armoring & Bitstream Explorer  
Inspect ITU-R M.1371 6-bit translation tables and armoring bit offsets.  
Plaintext String to Armor (Vessel Name / Text)  
Encode to 6-Bit Armored ASCII

Bitstream Packing Result  
Armored payload, bit length, and binary bit values.

Armored Payload:-  
Total Bit Count:-  
Binary Bit Stream:-

NMEA 2000 (IEC 61162-3) CAN Bus Synthesizer  
Translate AIS sentences into 29-bit CAN Identifier frames and PGN payloads.  
Target PGN PGN 129038 \- AIS Class A Position Report PGN 129039 \- AIS Class B Position Report PGN 129794 \- AIS Class A Static & Voyage Data  
Synthesize N2K CAN Frame

CAN Bus Frame Specification  
29-bit Extended ID, priority, and binary byte mapping.

PGN Number:129038 (0x1F802)  
CAN 29-Bit ID:0x101F8022A  
Priority:4  
Source Address:0x2A (42)  
Transmission Mode:Single Frame (28 Bytes Scaled)

Maritime Cyber Risk Audit Controls IMO MSC.428(98)  
Audit AIS feeds against GPS/AIS spoofing, velocity jumps, and IACS UR E26.  
Reported Speed Over Ground (SOG)  
Transmitted MMSI  
NMEA Checksum Mode Strict Checksum Enforcement (\*hh Verified) Permissive Mode (Forged Checksums Accepted)  
Bridge Ethernet Isolation (IEC 61162-450) Dedicated Nav Bridge VLAN with Stateful Firewall Flat Network (Shared with Crew/Administrative)  
Run IMO Maritime Audit Load Spoofed / Ghost Vessel Feed

Maritime Cybersecurity Scorecard GRADE: A+

100%  
**Fully Certified Maritime Bridge**  
IMO MSC.428(98) & IACS UR E26 Compliant

| ID | Vector Name | Status   |
| :---- | :---- | :---- |

Linux nftables Maritime Gateway Rules  
Stateful firewall isolation for IEC 61162-450 ECDIS networks (UDP 10110).  
Copy nftables Rules

Suricata Layer 7 Maritime Threat Signatures  
Deep Packet Inspection (DPI) signatures detecting AIS spoofing & NMEA DoS attacks.  
Copy Suricata Signatures

Vessel Traffic Services (VTS) Marine Radar Live Simulation  
Simulate live VHF AIS transmissions, position updates, and spoofing alert triggers.  
Simulate Jebel Ali Tanker Arrival Simulate Strait of Hormuz Transit Simulate Rogue GPS/AIS Spoof Attack Clear Telemetry Stream

00:00:00.000VTS Marine Radar Active. Monitoring VHF Ch 87B/88B (161.975/162.025 MHz).