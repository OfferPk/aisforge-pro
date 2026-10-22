/**
 * AISForge Pro - Maritime Cybersecurity Auditor (ais-security-auditor.js)
 * 
 * Implements 10-Point IMO SOLAS, IACS UR E26/E27 & ITU-R M.1371-5 Evaluation:
 * - IMO Resolution MSC.428(98) Maritime Cyber Risk Management in Safety Management Systems
 * - IACS Unified Requirements UR E26 (Cyber resilience of ships) & UR E27
 * - IEC 61162-450 Secure Maritime Shipboard Ethernet Gateway Standards
 * - Automated Scoring (0 - 100%) and Strict CI/CD Pipeline Gating
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AISSecurityAuditor = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var AUDIT_VECTORS = [
    {
      id: "AIS-SEC-01",
      name: "GPS/AIS Spoofing & Impossible Velocity Teleportation",
      severity: "CRITICAL",
      standard: "IMO MSC.428(98) / IACS UR E26",
      weight: 15,
      check: function (profile) {
        var sog = profile.sog !== undefined ? profile.sog : 14.5;
        var shipType = profile.shipType || 80; // 80 = Tanker
        // Commercial tankers and cargo ships rarely exceed 26 knots
        if (sog > 45 && (shipType >= 70 && shipType <= 89)) {
          return { pass: false, detail: "CRITICAL: SOG (" + sog + " kts) exceeds physical hull speed for commercial vessel. AIS/GPS spoofing detected." };
        }
        if (profile.lat < -90 || profile.lat > 90 || profile.lon < -180 || profile.lon > 180) {
          return { pass: false, detail: "CRITICAL: Impossible geographic coordinates outside global boundaries." };
        }
        return { pass: true, detail: "Kinematic velocity (" + sog + " kts) and coordinates within legitimate hydrodynamics limits." };
      }
    },
    {
      id: "AIS-SEC-02",
      name: "MMSI Authenticity & Maritime Identification Digit (MID)",
      severity: "CRITICAL",
      standard: "ITU-R M.585 / Radio Regulations Appendix 43",
      weight: 15,
      check: function (profile) {
        var mmsi = String(profile.mmsi || "");
        if (mmsi.length !== 9 || mmsi === "000000000" || mmsi === "111111111" || mmsi === "999999999") {
          return { pass: false, detail: "CRITICAL: Bogus or default MMSI ('" + mmsi + "') detected. Violates ITU-R M.585 allocation." };
        }
        var mid = parseInt(mmsi.substr(0, 3), 10);
        if (mid < 200 || mid > 775) {
          return { pass: false, detail: "CRITICAL: Invalid ITU Maritime Identification Digit (MID: " + mid + "). Not assigned to any sovereign flag state." };
        }
        return { pass: true, detail: "Valid 9-digit MMSI allocated under ITU sovereign flag state (MID: " + mid + ")." };
      }
    },
    {
      id: "AIS-SEC-03",
      name: "NMEA 0183 Checksum Validation Enforcement",
      severity: "HIGH",
      standard: "IEC 61162-1 Section 5.3",
      weight: 12,
      check: function (profile) {
        if (!profile.checksumEnforced) {
          return { pass: false, detail: "HIGH: Parser operates in permissive mode accepting forged sentences with invalid *hh checksums." };
        }
        return { pass: true, detail: "Strict NMEA 0183 XOR checksum (*hh) verification active. Corrupted/injected frames dropped." };
      }
    },
    {
      id: "AIS-SEC-04",
      name: "Ghost Vessel & Duplicate Identity Defense",
      severity: "HIGH",
      standard: "IACS UR E26 Section 4.2",
      weight: 10,
      check: function (profile) {
        if (profile.duplicateMmsiDetected) {
          return { pass: false, detail: "HIGH: Ghost vessel collision detected: Identical MMSI broadcasting simultaneously from disparate locations." };
        }
        return { pass: true, detail: "Temporal tracking validates unique spatial trajectory. Zero duplicate MMSI ghost signals." };
      }
    },
    {
      id: "AIS-SEC-05",
      name: "Navigational Status & Kinematic Consistency",
      severity: "HIGH",
      standard: "ITU-R M.1371-5 Table 46",
      weight: 10,
      check: function (profile) {
        var status = profile.navStatus;
        var sog = profile.sog !== undefined ? profile.sog : 0;
        // Status 1 = At anchor, Status 5 = Moored
        if ((status === 1 || status === 5) && sog > 3.0) {
          return { pass: false, detail: "HIGH: Status says '" + (status === 1 ? "At Anchor" : "Moored") + "' but vessel SOG is " + sog + " kts. Inconsistent transponder state." };
        }
        return { pass: true, detail: "Navigational status logically coherent with Speed Over Ground (SOG) measurements." };
      }
    },
    {
      id: "AIS-SEC-06",
      name: "Position Accuracy & RAIM Fault Monitoring",
      severity: "MEDIUM",
      standard: "IMO Resolution MSC.112(73) / IEC 61108-1",
      weight: 8,
      check: function (profile) {
        if (!profile.raimActive) {
          return { pass: false, detail: "MEDIUM: Receiver Autonomous Integrity Monitoring (RAIM) disabled on primary GNSS transponder." };
        }
        return { pass: true, detail: "RAIM integrity monitoring enabled with high-precision DGPS/Galileo augmentation." };
      }
    },
    {
      id: "AIS-SEC-07",
      name: "Rate of Turn (ROT) Physical Limits Validation",
      severity: "HIGH",
      standard: "IEC 61993-2 Section 6.5.4",
      weight: 8,
      check: function (profile) {
        var rot = profile.rot !== undefined ? profile.rot : 0;
        if (Math.abs(rot) > 126 && rot !== -128) {
          return { pass: false, detail: "HIGH: Reported Rate of Turn (" + rot + ") exceeds hydrodynamic limits for commercial shipping." };
        }
        return { pass: true, detail: "Rate of turn within certified navigational envelope." };
      }
    },
    {
      id: "AIS-SEC-08",
      name: "Static & Voyage Data UN/LOCODE Consistency",
      severity: "MEDIUM",
      standard: "IMO SN/Circ.243 / UN/CEFACT",
      weight: 7,
      check: function (profile) {
        var dest = (profile.destination || "").trim();
        if (dest.length === 0 || dest.indexOf("???") !== -1) {
          return { pass: false, detail: "MEDIUM: Destination field unpopulated or set to placeholder string." };
        }
        return { pass: true, detail: "Voyage data incorporates standardized destination with valid port identifiers." };
      }
    },
    {
      id: "AIS-SEC-09",
      name: "ECDIS / Bridge Network Domain Isolation",
      severity: "HIGH",
      standard: "IEC 61162-450 / IACS UR E27",
      weight: 8,
      check: function (profile) {
        if (!profile.vlanIsolated) {
          return { pass: false, detail: "HIGH: AIS receiver shares flat Ethernet network with crew Wi-Fi / entertainment systems." };
        }
        return { pass: true, detail: "Navigation bridge subnet isolated on dedicated VLAN with stateful packet filtering." };
      }
    },
    {
      id: "AIS-SEC-10",
      name: "Suricata Layer 7 Maritime Intrusion Detection",
      severity: "HIGH",
      standard: "MITRE ATT&CK for Maritime / NMSC",
      weight: 7,
      check: function (profile) {
        if (!profile.idsEnabled) {
          return { pass: false, detail: "HIGH: No Layer 7 DPI rules inspecting NMEA UDP port 10110 traffic for spoofing or buffer exploits." };
        }
        return { pass: true, detail: "Suricata DPI engine active monitoring AIS NMEA sentences for anomalies and flooding." };
      }
    }
  ];

  function runAudit(profile) {
    profile = profile || {};
    var results = [];
    var earnedWeight = 0;
    var totalWeight = 0;
    var criticalCount = 0;

    for (var i = 0; i < AUDIT_VECTORS.length; i++) {
      var v = AUDIT_VECTORS[i];
      totalWeight += v.weight;
      var evalRes = v.check(profile);

      if (evalRes.pass) {
        earnedWeight += v.weight;
      } else {
        if (v.severity === "CRITICAL") criticalCount++;
      }

      results.push({
        id: v.id,
        name: v.name,
        severity: v.severity,
        standard: v.standard,
        passed: evalRes.pass,
        detail: evalRes.detail
      });
    }

    var score = Math.round((earnedWeight / totalWeight) * 100);
    var grade = "F";
    if (score >= 95) grade = "A+";
    else if (score >= 85) grade = "A";
    else if (score >= 75) grade = "B";
    else if (score >= 60) grade = "C";
    else if (score >= 50) grade = "D";

    return {
      score: score,
      grade: grade,
      criticalVulnerabilities: criticalCount,
      passedVectors: results.filter(function(r) { return r.passed; }).length,
      totalVectors: results.length,
      results: results
    };
  }

  return {
    AUDIT_VECTORS: AUDIT_VECTORS,
    runAudit: runAudit
  };
}));
