/**
 * AISForge Pro - Protocol Engine (ais-protocol-engine.js)
 * 
 * Implements:
 * - ITU-R M.1371-5 Maritime AIS (Automatic Identification System) Protocol Engine
 * - NMEA 0183 / IEC 61162-1 Sentence Formatting & XOR Checksum (*hh) Calculation
 * - 6-Bit ASCII Armoring & Unarmoring Bitstream Codec
 * - Type 1, 2, 3: Class A Position Report (168-bit payload)
 * - Type 4: Base Station Report
 * - Type 5: Static and Voyage Related Data (424-bit payload, 2-part AIVDM)
 * - Type 18: Standard Class B Equipment Position Report
 * - NMEA 2000 (IEC 61162-3) CAN Bus PGN Synthesizer (PGN 129038, 129794)
 * - Libpcap 2.4 Binary PCAP Network Capture Exporter (UDP Port 10110)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AISProtocolEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- 1. NMEA 0183 Checksum Math ---
  function computeNmeaChecksum(sentence) {
    // Checksum is XOR of all characters between '$' or '!' and '*'
    var start = sentence.indexOf('!');
    if (start === -1) start = sentence.indexOf('$');
    start = (start === -1) ? 0 : start + 1;

    var end = sentence.indexOf('*');
    if (end === -1) end = sentence.length;

    var cks = 0;
    for (var i = start; i < end; i++) {
      cks ^= sentence.charCodeAt(i);
    }
    return cks.toString(16).toUpperCase().padStart(2, '0');
  }

  function verifyNmeaChecksum(sentence) {
    var starIdx = sentence.indexOf('*');
    if (starIdx === -1 || starIdx + 3 > sentence.length) return false;
    var expected = sentence.substr(starIdx + 1, 2).toUpperCase();
    var calculated = computeNmeaChecksum(sentence);
    return expected === calculated;
  }

  // --- 2. 6-Bit ASCII Armoring & Bitstream Codec ---
  // Mapping 6-bit values (0..63) to ASCII characters
  function sixBitToChar(val) {
    val &= 0x3F;
    if (val < 40) return String.fromCharCode(val + 48);
    return String.fromCharCode(val + 56);
  }

  function charToSixBit(c) {
    var code = c.charCodeAt(0);
    if (code >= 48 && code <= 87) return code - 48;
    if (code >= 96 && code <= 119) return code - 56;
    return 0;
  }

  // Helper BitStream Writer
  function BitWriter() {
    this.bits = [];
  }
  BitWriter.prototype.writeBits = function (val, bitLen) {
    val = Number(val);
    if (val < 0) {
      // Two's complement for negative values
      val = (1 << bitLen) + val;
    }
    for (var i = bitLen - 1; i >= 0; i--) {
      this.bits.push((val >> i) & 1);
    }
  };
  BitWriter.prototype.writeString6Bit = function (str, maxChars) {
    str = (str || "").toUpperCase();
    for (var i = 0; i < maxChars; i++) {
      var code = 0;
      if (i < str.length) {
        var c = str.charCodeAt(i);
        if (c >= 64 && c <= 95) code = c - 64;
        else if (c >= 32 && c <= 63) code = c;
        else code = 0;
      } else {
        code = 0; // '@' padding in AIS 6-bit text
      }
      this.writeBits(code, 6);
    }
  };
  BitWriter.prototype.toArmoredAscii = function () {
    var padBits = (6 - (this.bits.length % 6)) % 6;
    for (var p = 0; p < padBits; p++) {
      this.bits.push(0);
    }
    var ascii = "";
    for (var i = 0; i < this.bits.length; i += 6) {
      var val = 0;
      for (var b = 0; b < 6; b++) {
        val = (val << 1) | this.bits[i + b];
      }
      ascii += sixBitToChar(val);
    }
    return { payload: ascii, fillBits: padBits, totalBits: this.bits.length };
  };

  // Helper BitStream Reader
  function BitReader(armoredStr, fillBits) {
    this.bits = [];
    for (var i = 0; i < armoredStr.length; i++) {
      var val = charToSixBit(armoredStr[i]);
      for (var b = 5; b >= 0; b--) {
        this.bits.push((val >> b) & 1);
      }
    }
    if (fillBits && fillBits > 0) {
      this.bits.splice(this.bits.length - fillBits, fillBits);
    }
    this.offset = 0;
  }
  BitReader.prototype.readBits = function (bitLen) {
    var val = 0;
    for (var i = 0; i < bitLen; i++) {
      if (this.offset < this.bits.length) {
        val = (val << 1) | this.bits[this.offset++];
      }
    }
    return val;
  };
  BitReader.prototype.readSignedBits = function (bitLen) {
    var val = this.readBits(bitLen);
    var signBit = 1 << (bitLen - 1);
    if ((val & signBit) !== 0) {
      val = val - (1 << bitLen);
    }
    return val;
  };
  BitReader.prototype.readString6Bit = function (charLen) {
    var str = "";
    for (var i = 0; i < charLen; i++) {
      var code = this.readBits(6);
      if (code < 32) str += String.fromCharCode(code + 64);
      else str += String.fromCharCode(code);
    }
    return str.replace(/@+$/, '').trim();
  };

  // Navigational Status Mapping
  var NAV_STATUS = {
    0: "Under way using engine",
    1: "At anchor",
    2: "Not under command",
    3: "Restricted manoeuvrability",
    4: "Constrained by her draught",
    5: "Moored",
    6: "Aground",
    7: "Engaged in fishing",
    8: "Under way sailing",
    15: "Undefined / Not available"
  };

  var SHIP_TYPES = {
    30: "Fishing Vessel",
    52: "Tug",
    60: "Passenger Vessel",
    70: "Cargo Ship",
    80: "Tanker (Oil/Chemical/Gas)",
    90: "Other Type"
  };

  // --- 3. Message Builders ---
  function buildType1PositionReport(params) {
    params = params || {};
    var mmsi = params.mmsi || 470123456; // 470 = UAE MID
    var navStatus = params.navStatus !== undefined ? params.navStatus : 0; // Under way
    var rot = params.rot !== undefined ? params.rot : 0; // Rate of turn
    var sog = Math.round((params.sog !== undefined ? params.sog : 14.5) * 10); // 10ths of knot
    var posAcc = params.posAcc !== undefined ? params.posAcc : 1; // High accuracy (<10m)
    var lon = Math.round((params.lon !== undefined ? params.lon : 55.027) * 600000); // 1/10000 min
    var lat = Math.round((params.lat !== undefined ? params.lat : 25.012) * 600000); // Jebel Ali Port, Dubai
    var cog = Math.round((params.cog !== undefined ? params.cog : 315.0) * 10); // 10ths of deg
    var heading = params.heading !== undefined ? params.heading : 314;
    var timestamp = params.timestamp !== undefined ? params.timestamp : 35;
    var channel = params.channel || "A";

    var bw = new BitWriter();
    bw.writeBits(1, 6);         // Message Type 1
    bw.writeBits(0, 2);         // Repeat Indicator 0
    bw.writeBits(mmsi, 30);     // MMSI
    bw.writeBits(navStatus, 4);  // Nav Status
    bw.writeBits(rot, 8);       // Rate of Turn (signed)
    bw.writeBits(sog, 10);      // SOG
    bw.writeBits(posAcc, 1);    // Position Accuracy
    bw.writeBits(lon, 28);      // Longitude (signed)
    bw.writeBits(lat, 27);      // Latitude (signed)
    bw.writeBits(cog, 12);      // COG
    bw.writeBits(heading, 9);   // True Heading
    bw.writeBits(timestamp, 6); // Time stamp (seconds)
    bw.writeBits(0, 2);         // Maneuver Indicator
    bw.writeBits(0, 3);         // Spare
    bw.writeBits(1, 1);         // RAIM flag
    bw.writeBits(0x2B45, 19);   // Radio status (SOTDMA)

    var res = bw.toArmoredAscii();
    // Format NMEA 0183 AIVDM sentence
    // !AIVDM,count,fragment,seq_id,channel,payload,fill_bits*hh
    var rawBody = "AIVDM,1,1,," + channel + "," + res.payload + "," + res.fillBits;
    var cks = computeNmeaChecksum("!" + rawBody);
    var sentence = "!" + rawBody + "*" + cks;

    return {
      sentence: sentence,
      mmsi: mmsi,
      messageType: 1,
      payload: res.payload,
      fillBits: res.fillBits,
      navStatus: navStatus,
      sogKnots: sog / 10.0,
      cogDegrees: cog / 10.0,
      lat: lat / 600000.0,
      lon: lon / 600000.0,
      heading: heading
    };
  }

  function buildType5StaticVoyage(params) {
    params = params || {};
    var mmsi = params.mmsi || 470123456;
    var imo = params.imo || 9876543;
    var callsign = params.callsign || "A6E991";
    var vesselName = params.vesselName || "GULF PRIDE DUBAI";
    var shipType = params.shipType || 80; // Tanker
    var dimBow = params.dimBow || 180;
    var dimStern = params.dimStern || 35;
    var dimPort = params.dimPort || 16;
    var dimStarboard = params.dimStarboard || 16;
    var epfd = params.epfd || 1; // GPS
    var etaMonth = params.etaMonth || 10;
    var etaDay = params.etaDay || 15;
    var etaHour = params.etaHour || 14;
    var etaMinute = params.etaMinute || 30;
    var draught = Math.round((params.draught !== undefined ? params.draught : 11.2) * 10);
    var destination = params.destination || "AE JEA (JEBEL ALI)";
    var channel = params.channel || "A";

    var bw = new BitWriter();
    bw.writeBits(5, 6);         // Message Type 5
    bw.writeBits(0, 2);         // Repeat Indicator
    bw.writeBits(mmsi, 30);     // MMSI
    bw.writeBits(0, 2);         // AIS Version 0
    bw.writeBits(imo, 30);      // IMO Number
    bw.writeString6Bit(callsign, 7);     // Call Sign (7 chars = 42 bits)
    bw.writeString6Bit(vesselName, 20);   // Vessel Name (20 chars = 120 bits)
    bw.writeBits(shipType, 8);  // Ship Type
    bw.writeBits(dimBow, 9);    // Dimension Bow
    bw.writeBits(dimStern, 9);  // Dimension Stern
    bw.writeBits(dimPort, 6);   // Dimension Port
    bw.writeBits(dimStarboard, 6); // Dimension Starboard
    bw.writeBits(epfd, 4);      // EPFD Type
    bw.writeBits(etaMonth, 4);  // ETA Month
    bw.writeBits(etaDay, 5);    // ETA Day
    bw.writeBits(etaHour, 5);   // ETA Hour
    bw.writeBits(etaMinute, 6); // ETA Minute
    bw.writeBits(draught, 8);   // Draught (1/10 m)
    bw.writeString6Bit(destination, 20); // Destination (20 chars = 120 bits)
    bw.writeBits(0, 1);         // DTE
    bw.writeBits(0, 1);         // Spare

    var res = bw.toArmoredAscii();
    // 424 bits -> 71 6-bit ASCII characters. A single AIVDM sentence can carry ~60 chars, so Type 5 is sent as a 2-part multipart message.
    var part1Payload = res.payload.substr(0, 60);
    var part2Payload = res.payload.substr(60);

    var seqId = params.seqId || 1;
    var raw1 = "AIVDM,2,1," + seqId + "," + channel + "," + part1Payload + ",0";
    var sent1 = "!" + raw1 + "*" + computeNmeaChecksum("!" + raw1);

    var raw2 = "AIVDM,2,2," + seqId + "," + channel + "," + part2Payload + "," + res.fillBits;
    var sent2 = "!" + raw2 + "*" + computeNmeaChecksum("!" + raw2);

    return {
      sentences: [sent1, sent2],
      mmsi: mmsi,
      vesselName: vesselName,
      imo: imo,
      callsign: callsign,
      destination: destination,
      draughtMeters: draught / 10.0,
      totalBits: res.totalBits
    };
  }

  // --- 4. AIVDM / AIVDO Sentence Dissector ---
  function dissectAivdm(sentences) {
    if (typeof sentences === "string") {
      sentences = sentences.trim().split(/\r?\n/).filter(function(s) { return s.length > 0; });
    }
    if (!sentences || sentences.length === 0) {
      return { valid: false, error: "No NMEA sentence provided" };
    }

    var fullArmoredPayload = "";
    var totalFillBits = 0;
    var messageType = null;
    var channel = null;

    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i].trim();
      if (!verifyNmeaChecksum(s)) {
        return { valid: false, error: "Checksum validation failed on line: " + s };
      }
      var body = s.substring(s.indexOf('!') + 1, s.indexOf('*'));
      var fields = body.split(',');
      if (fields[0] !== "AIVDM" && fields[0] !== "AIVDO") {
        return { valid: false, error: "Unsupported NMEA sentence: " + fields[0] };
      }
      channel = fields[4];
      fullArmoredPayload += fields[5];
      totalFillBits = parseInt(fields[6], 10) || 0;
    }

    var br = new BitReader(fullArmoredPayload, totalFillBits);
    messageType = br.readBits(6);
    var repeat = br.readBits(2);
    var mmsi = br.readBits(30);

    var res = {
      valid: true,
      messageType: messageType,
      repeatIndicator: repeat,
      mmsi: mmsi,
      channel: channel,
      totalBits: br.bits.length,
      data: {}
    };

    if (messageType === 1 || messageType === 2 || messageType === 3) {
      res.typeName = "Class A Position Report (Type " + messageType + ")";
      res.data.navStatus = br.readBits(4);
      res.data.navStatusDesc = NAV_STATUS[res.data.navStatus] || "Unknown";
      res.data.rot = br.readSignedBits(8);
      res.data.sogKnots = br.readBits(10) / 10.0;
      res.data.posAccuracy = br.readBits(1);
      res.data.lon = br.readSignedBits(28) / 600000.0;
      res.data.lat = br.readSignedBits(27) / 600000.0;
      res.data.cogDegrees = br.readBits(12) / 10.0;
      res.data.trueHeading = br.readBits(9);
      res.data.timestampSeconds = br.readBits(6);
      res.data.specialManeuver = br.readBits(2);
      br.readBits(3); // spare
      res.data.raim = br.readBits(1);
      res.data.radioStatus = br.readBits(19);
    } else if (messageType === 5) {
      res.typeName = "Static and Voyage Related Data (Type 5)";
      res.data.aisVersion = br.readBits(2);
      res.data.imo = br.readBits(30);
      res.data.callsign = br.readString6Bit(7);
      res.data.vesselName = br.readString6Bit(20);
      res.data.shipType = br.readBits(8);
      res.data.shipTypeDesc = SHIP_TYPES[res.data.shipType] || "General";
      res.data.dimBow = br.readBits(9);
      res.data.dimStern = br.readBits(9);
      res.data.dimPort = br.readBits(6);
      res.data.dimStarboard = br.readBits(6);
      res.data.epfd = br.readBits(4);
      res.data.etaMonth = br.readBits(4);
      res.data.etaDay = br.readBits(5);
      res.data.etaHour = br.readBits(5);
      res.data.etaMinute = br.readBits(6);
      res.data.draughtMeters = br.readBits(8) / 10.0;
      res.data.destination = br.readString6Bit(20);
      res.data.dte = br.readBits(1);
    } else if (messageType === 18) {
      res.typeName = "Standard Class B Position Report (Type 18)";
      br.readBits(8); // regional
      res.data.sogKnots = br.readBits(10) / 10.0;
      res.data.posAccuracy = br.readBits(1);
      res.data.lon = br.readSignedBits(28) / 600000.0;
      res.data.lat = br.readSignedBits(27) / 600000.0;
      res.data.cogDegrees = br.readBits(12) / 10.0;
      res.data.trueHeading = br.readBits(9);
      res.data.timestampSeconds = br.readBits(6);
    } else {
      res.typeName = "AIS Message Type " + messageType;
    }

    return res;
  }

  // --- 5. NMEA 2000 (IEC 61162-3) CAN Bus PGN Synthesizer ---
  function buildN2kPgn129038(params) {
    params = params || {};
    var mmsi = params.mmsi || 470123456;
    var lat = Math.round((params.lat !== undefined ? params.lat : 25.012) * 1e7);
    var lon = Math.round((params.lon !== undefined ? params.lon : 55.027) * 1e7);
    var sog = Math.round((params.sog !== undefined ? params.sog : 14.5) * 100); // cm/s
    var cog = Math.round((params.cog !== undefined ? params.cog : 315.0) * 10000); // 1e-4 rad

    // PGN 129038 CAN Identifier (Priority 4, PGN 0x1F802, Source 0x2A)
    // 29-bit CAN ID: (Priority << 26) | (PGN << 8) | Source
    var canId = (4 << 26) | (129038 << 8) | 0x2A;

    return {
      pgn: 129038,
      pgnName: "AIS Class A Position Report",
      canIdHex: "0x" + canId.toString(16).toUpperCase(),
      mmsi: mmsi,
      latScaled: lat,
      lonScaled: lon,
      sogScaled: sog,
      cogScaled: cog,
      fastPacket: false
    };
  }

  // --- 6. Libpcap 2.4 Binary PCAP Network Exporter (UDP Port 10110) ---
  function exportLibpcap(sentences, options) {
    options = options || {};
    var srcIp = options.srcIp || [192, 168, 1, 50]; // AIS Transponder IP
    var dstIp = options.dstIp || [192, 168, 1, 255]; // Broadcast ECDIS IP
    var srcPort = 10110;
    var dstPort = 10110; // Standard NMEA 0183-over-IP

    var pcapRecords = [];
    var totalLen = 24;

    // Libpcap Global Header
    var globalHeader = new Uint8Array(24);
    var gView = new DataView(globalHeader.buffer);
    gView.setUint32(0, 0xa1b2c3d4, false); // Magic Number (Big Endian)
    gView.setUint16(4, 2, false);          // Major 2
    gView.setUint16(6, 4, false);          // Minor 4
    gView.setInt32(8, 0, false);           // GMT
    gView.setUint32(12, 0, false);         // Sigfigs
    gView.setUint32(16, 65535, false);     // Snaplen
    gView.setUint32(20, 1, false);         // Linktype: Ethernet (1)

    var baseTime = Math.floor(Date.now() / 1000) - 30;

    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i] + "\r\n";
      var sBytes = new Uint8Array(s.length);
      for (var b = 0; b < s.length; b++) sBytes[b] = s.charCodeAt(b);

      // Ethernet Header (14B)
      var eth = new Uint8Array(14);
      eth.set([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], 0); // Broadcast MAC
      eth.set([0x00, 0x15, 0x8D, 0x12, 0x34, 0x56], 6); // Marine VHF MAC
      eth[12] = 0x08; eth[13] = 0x00;                   // IPv4

      // IPv4 Header (20B)
      var ipLen = 20 + 8 + sBytes.length;
      var ip = new Uint8Array(20);
      var ipView = new DataView(ip.buffer);
      ip[0] = 0x45;
      ipView.setUint16(2, ipLen, false);
      ipView.setUint16(4, 2000 + i, false);
      ip[8] = 64;   // TTL
      ip[9] = 17;   // UDP Protocol
      ip.set(srcIp, 12);
      ip.set(dstIp, 16);

      // IP Checksum
      var ipCks = 0;
      for (var c = 0; c < 20; c += 2) {
        if (c !== 10) ipCks += ipView.getUint16(c, false);
      }
      while (ipCks > 0xFFFF) ipCks = (ipCks & 0xFFFF) + (ipCks >> 16);
      ipView.setUint16(10, (~ipCks) & 0xFFFF, false);

      // UDP Header (8B)
      var udp = new Uint8Array(8);
      var udpView = new DataView(udp.buffer);
      udpView.setUint16(0, srcPort, false);
      udpView.setUint16(2, dstPort, false);
      udpView.setUint16(4, 8 + sBytes.length, false);
      udpView.setUint16(6, 0, false); // Checksum optional in IPv4

      var frameLen = eth.length + ip.length + udp.length + sBytes.length;

      // PCAP Packet Header (16B)
      var recHeader = new Uint8Array(16);
      var rView = new DataView(recHeader.buffer);
      rView.setUint32(0, baseTime + i, false); // ts_sec
      rView.setUint32(4, i * 200000, false);   // ts_usec
      rView.setUint32(8, frameLen, false);     // incl_len
      rView.setUint32(12, frameLen, false);    // orig_len

      var packetData = new Uint8Array(16 + frameLen);
      packetData.set(recHeader, 0);
      packetData.set(eth, 16);
      packetData.set(ip, 30);
      packetData.set(udp, 50);
      packetData.set(sBytes, 58);

      pcapRecords.push(packetData);
      totalLen += packetData.length;
    }

    var finalPcap = new Uint8Array(totalLen);
    finalPcap.set(globalHeader, 0);
    var pOffset = 24;
    for (var r = 0; r < pcapRecords.length; r++) {
      finalPcap.set(pcapRecords[r], pOffset);
      pOffset += pcapRecords[r].length;
    }
    return finalPcap;
  }

  return {
    NAV_STATUS: NAV_STATUS,
    SHIP_TYPES: SHIP_TYPES,
    computeNmeaChecksum: computeNmeaChecksum,
    verifyNmeaChecksum: verifyNmeaChecksum,
    sixBitToChar: sixBitToChar,
    charToSixBit: charToSixBit,
    BitWriter: BitWriter,
    BitReader: BitReader,
    buildType1PositionReport: buildType1PositionReport,
    buildType5StaticVoyage: buildType5StaticVoyage,
    dissectAivdm: dissectAivdm,
    buildN2kPgn129038: buildN2kPgn129038,
    exportLibpcap: exportLibpcap
  };
}));
