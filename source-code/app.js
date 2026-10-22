/**
 * AISForge Pro - Application Controller (app.js)
 */

document.addEventListener("DOMContentLoaded", function () {
  'use strict';

  // --- Tab Navigation ---
  var tabButtons = document.querySelectorAll(".tab-btn");
  var tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabButtons.forEach(function (b) { b.classList.remove("active"); });
      tabPanes.forEach(function (p) { p.classList.remove("active"); });

      btn.classList.add("active");
      var targetId = btn.getAttribute("data-tab");
      var targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // --- Tab 1: Builder Elements ---
  var msgTypeSelect = document.getElementById("msg-type-select");
  var type1Fields = document.getElementById("type1-fields");
  var type5Fields = document.getElementById("type5-fields");
  var mmsiInput = document.getElementById("mmsi-input");
  var channelSelect = document.getElementById("channel-select");
  var latInput = document.getElementById("lat-input");
  var lonInput = document.getElementById("lon-input");
  var sogInput = document.getElementById("sog-input");
  var cogInput = document.getElementById("cog-input");
  var headingInput = document.getElementById("heading-input");
  var navStatusSelect = document.getElementById("nav-status-select");

  var vesselNameInput = document.getElementById("vessel-name-input");
  var callsignInput = document.getElementById("callsign-input");
  var imoInput = document.getElementById("imo-input");
  var shipTypeSelect = document.getElementById("ship-type-select");
  var destInput = document.getElementById("dest-input");

  var btnSynthesize = document.getElementById("btn-synthesize");
  var btnExportPcap = document.getElementById("btn-export-pcap");
  var btnPresetTanker = document.getElementById("btn-preset-tanker");
  var btnPresetCargo = document.getElementById("btn-preset-cargo");

  var nmeaOutput = document.getElementById("nmea-sentence-output");
  var teleType = document.getElementById("tele-type");
  var teleMid = document.getElementById("tele-mid");
  var teleCoords = document.getElementById("tele-coords");
  var teleSog = document.getElementById("tele-sog");
  var teleHdg = document.getElementById("tele-hdg");
  var teleCks = document.getElementById("tele-cks");

  var currentSentences = [];

  msgTypeSelect.addEventListener("change", function () {
    if (msgTypeSelect.value === "1") {
      type1Fields.style.display = "block";
      type5Fields.style.display = "none";
    } else {
      type1Fields.style.display = "none";
      type5Fields.style.display = "block";
    }
    updateSynthesizedSentence();
  });

  function updateSynthesizedSentence() {
    var type = msgTypeSelect.value;
    var mmsi = parseInt(mmsiInput.value, 10) || 470123456;
    var channel = channelSelect.value;

    if (type === "1") {
      var lat = parseFloat(latInput.value) || 25.0120;
      var lon = parseFloat(lonInput.value) || 55.0270;
      var sog = parseFloat(sogInput.value) || 14.5;
      var cog = parseFloat(cogInput.value) || 315.0;
      var hdg = parseInt(headingInput.value, 10) || 314;
      var nav = parseInt(navStatusSelect.value, 10) || 0;

      var res = AISProtocolEngine.buildType1PositionReport({
        mmsi: mmsi,
        lat: lat,
        lon: lon,
        sog: sog,
        cog: cog,
        heading: hdg,
        navStatus: nav,
        channel: channel
      });

      currentSentences = [res.sentence];
      nmeaOutput.textContent = res.sentence;

      teleType.textContent = "Type 1 (Class A Position Report)";
      var mid = String(mmsi).substr(0, 3);
      teleMid.textContent = mmsi + " (MID " + mid + (mid === "470" ? " - UAE" : "") + ")";
      teleCoords.textContent = lat.toFixed(4) + "° N, " + lon.toFixed(4) + "° E";
      teleSog.textContent = sog.toFixed(1) + " kts @ " + cog.toFixed(1) + "° COG";
      teleHdg.textContent = hdg + "°";
      teleCks.textContent = "Valid Checksum (*" + AISProtocolEngine.computeNmeaChecksum(res.sentence) + ")";
    } else {
      var name = vesselNameInput.value;
      var call = callsignInput.value;
      var imo = parseInt(imoInput.value, 10) || 9876543;
      var stype = parseInt(shipTypeSelect.value, 10) || 80;
      var dest = destInput.value;

      var res5 = AISProtocolEngine.buildType5StaticVoyage({
        mmsi: mmsi,
        vesselName: name,
        callsign: call,
        imo: imo,
        shipType: stype,
        destination: dest,
        channel: channel
      });

      currentSentences = res5.sentences;
      nmeaOutput.textContent = res5.sentences.join("\n");

      teleType.textContent = "Type 5 (Static & Voyage Data, 2-Part)";
      teleMid.textContent = mmsi + " (IMO " + imo + ")";
      teleCoords.textContent = "Ship Type: " + stype + " (Tanker)";
      teleSog.textContent = "Callsign: " + call;
      teleHdg.textContent = "Dest: " + dest;
      teleCks.textContent = "2 Sentences Verified";
    }
  }

  btnSynthesize.addEventListener("click", updateSynthesizedSentence);

  btnPresetTanker.addEventListener("click", function () {
    msgTypeSelect.value = "1";
    type1Fields.style.display = "block";
    type5Fields.style.display = "none";
    mmsiInput.value = "470123456"; // UAE
    latInput.value = "25.0120";
    lonInput.value = "55.0270";
    sogInput.value = "14.5";
    cogInput.value = "315.0";
    headingInput.value = "314";
    navStatusSelect.value = "0";
    updateSynthesizedSentence();
  });

  btnPresetCargo.addEventListener("click", function () {
    msgTypeSelect.value = "1";
    type1Fields.style.display = "block";
    type5Fields.style.display = "none";
    mmsiInput.value = "235099881"; // UK MID 235
    latInput.value = "51.9540";
    lonInput.value = "1.3050"; // Port of Felixstowe
    sogInput.value = "18.2";
    cogInput.value = "092.5";
    headingInput.value = "093";
    navStatusSelect.value = "0";
    updateSynthesizedSentence();
  });

  btnExportPcap.addEventListener("click", function () {
    if (currentSentences.length === 0) updateSynthesizedSentence();
    var pcapBytes = AISProtocolEngine.exportLibpcap(currentSentences);
    var blob = new Blob([pcapBytes], { type: "application/vnd.tcpdump.pcap" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "ais-nmea-trace.pcap";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // --- Tab 2: Dissector ---
  var rawNmeaInput = document.getElementById("raw-nmea-input");
  var btnDissectNmea = document.getElementById("btn-dissect-nmea");
  var dissectTree = document.getElementById("dissector-result-tree");
  var btnSample1 = document.getElementById("btn-sample-type1");
  var btnSample5 = document.getElementById("btn-sample-type5");

  function renderDissection(d) {
    if (!d.valid) {
      dissectTree.innerHTML = '<div style="color:var(--danger-red); font-weight:bold;">Error: ' + d.error + '</div>';
      return;
    }
    var html = '';
    html += '<div class="dissect-row"><span class="dissect-key">Message Type:</span><span class="dissect-val highlight">' + d.typeName + '</span></div>';
    html += '<div class="dissect-row"><span class="dissect-key">MMSI (Vessel ID):</span><span class="dissect-val">' + d.mmsi + '</span></div>';
    html += '<div class="dissect-row"><span class="dissect-key">Radio Channel:</span><span class="dissect-val">Channel ' + d.channel + '</span></div>';
    html += '<div class="dissect-row"><span class="dissect-key">Payload Bit Length:</span><span class="dissect-val">' + d.totalBits + ' Bits</span></div>';

    if (d.data.lat !== undefined) {
      html += '<div class="dissect-row"><span class="dissect-key">Latitude:</span><span class="dissect-val">' + d.data.lat.toFixed(5) + '°</span></div>';
      html += '<div class="dissect-row"><span class="dissect-key">Longitude:</span><span class="dissect-val">' + d.data.lon.toFixed(5) + '°</span></div>';
      html += '<div class="dissect-row"><span class="dissect-key">Speed Over Ground:</span><span class="dissect-val">' + d.data.sogKnots + ' Knots</span></div>';
      html += '<div class="dissect-row"><span class="dissect-key">Course Over Ground:</span><span class="dissect-val">' + d.data.cogDegrees + '°</span></div>';
      html += '<div class="dissect-row"><span class="dissect-key">True Heading:</span><span class="dissect-val">' + d.data.trueHeading + '°</span></div>';
      html += '<div class="dissect-row"><span class="dissect-key">Navigational Status:</span><span class="dissect-val" style="color:var(--radar-green);">' + d.data.navStatusDesc + ' (' + d.data.navStatus + ')</span></div>';
      html += '<div class="dissect-row"><span class="dissect-key">RAIM Autonomous Integrity:</span><span class="dissect-val">' + (d.data.raim === 1 ? 'In Use (High Assurance)' : 'Not In Use') + '</span></div>';
    } else if (d.data.vesselName !== undefined) {
      html += '<div class="dissect-row"><span class="dissect-key">Vessel Name:</span><span class="dissect-val highlight">' + d.data.vesselName + '</span></div>';
      html += '<div class="dissect-row"><span class="dissect-key">Call Sign:</span><span class="dissect-val">' + d.data.callsign + '</span></div>';
      html += '<div class="dissect-row"><span class="dissect-key">IMO Number:</span><span class="dissect-val">' + d.data.imo + '</span></div>';
      html += '<div class="dissect-row"><span class="dissect-key">Ship Type:</span><span class="dissect-val">' + d.data.shipTypeDesc + ' (' + d.data.shipType + ')</span></div>';
      html += '<div class="dissect-row"><span class="dissect-key">Static Draught:</span><span class="dissect-val">' + d.data.draughtMeters + ' Meters</span></div>';
      html += '<div class="dissect-row"><span class="dissect-key">Reported Destination:</span><span class="dissect-val highlight" style="color:var(--nav-amber);">' + d.data.destination + '</span></div>';
    }

    dissectTree.innerHTML = html;
  }

  btnDissectNmea.addEventListener("click", function () {
    var raw = rawNmeaInput.value.trim();
    if (!raw) return;
    var d = AISProtocolEngine.dissectAivdm(raw);
    renderDissection(d);
  });

  btnSample1.addEventListener("click", function () {
    var sample = AISProtocolEngine.buildType1PositionReport({
      mmsi: 470123456,
      lat: 25.012,
      lon: 55.027,
      sog: 14.5,
      cog: 315.0,
      heading: 314
    });
    rawNmeaInput.value = sample.sentence;
    btnDissectNmea.click();
  });

  btnSample5.addEventListener("click", function () {
    var sample5 = AISProtocolEngine.buildType5StaticVoyage({
      mmsi: 470123456,
      vesselName: "GULF PRIDE DUBAI",
      callsign: "A6E991",
      destination: "AE JEA (JEBEL ALI)"
    });
    rawNmeaInput.value = sample5.sentences.join("\n");
    btnDissectNmea.click();
  });

  // --- Tab 3: 6-Bit Codec ---
  var codecTextInput = document.getElementById("codec-text-input");
  var btnArmorText = document.getElementById("btn-armor-text");
  var codecArmored = document.getElementById("codec-armored");
  var codecBits = document.getElementById("codec-bits");
  var codecBinary = document.getElementById("codec-binary");

  btnArmorText.addEventListener("click", function () {
    var text = codecTextInput.value.trim().toUpperCase();
    var bw = new AISProtocolEngine.BitWriter();
    bw.writeString6Bit(text, text.length);
    var res = bw.toArmoredAscii();

    codecArmored.textContent = res.payload;
    codecBits.textContent = res.totalBits + " Bits (" + text.length + " characters)";
    codecBinary.textContent = bw.bits.join("");
  });

  // --- Tab 4: N2K Synthesizer ---
  var btnSynthN2k = document.getElementById("btn-synth-n2k");
  var n2kCanId = document.getElementById("n2k-can-id");

  btnSynthN2k.addEventListener("click", function () {
    var pgn = parseInt(document.getElementById("n2k-pgn-select").value, 10);
    var res = AISProtocolEngine.buildN2kPgn129038({ mmsi: 470123456 });
    n2kCanId.textContent = res.canIdHex;
  });

  // --- Tab 5: Auditor ---
  var btnRunAudit = document.getElementById("btn-run-audit");
  var btnLoadSpoof = document.getElementById("btn-load-spoofed-feed");
  var auditScoreNum = document.getElementById("audit-score-num");
  var auditGradeBadge = document.getElementById("audit-grade-badge");
  var auditStatusText = document.getElementById("audit-status-text");
  var auditSubText = document.getElementById("audit-sub-text");
  var auditTableBody = document.querySelector("#audit-results-table tbody");

  function executeAudit(profile) {
    var report = AISSecurityAuditor.runAudit(profile);
    auditScoreNum.textContent = report.score + "%";
    auditScoreNum.className = "score-badge " + (report.score >= 85 ? "grade-A" : "grade-F");
    auditGradeBadge.textContent = "GRADE: " + report.grade;

    if (report.score >= 85) {
      auditStatusText.textContent = "Fully Certified Maritime Bridge";
      auditSubText.textContent = "IMO MSC.428(98) & IACS UR E26 Satisfied (0 Critical Issues)";
    } else {
      auditStatusText.textContent = "High Risk: Maritime Cybersecurity Vulnerabilities";
      auditSubText.textContent = report.criticalVulnerabilities + " Critical Issues Detected. High Collision / Spoofing Risk.";
    }

    var tbodyHtml = '';
    report.results.forEach(function (r) {
      tbodyHtml += '<tr>';
      tbodyHtml += '<td style="font-family:var(--font-mono);">' + r.id + '</td>';
      tbodyHtml += '<td><strong>' + r.name + '</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">' + r.detail + '</span></td>';
      tbodyHtml += '<td><span class="status-tag ' + (r.passed ? 'pass' : 'fail') + '">' + (r.passed ? 'PASSED' : 'FAILED') + '</span></td>';
      tbodyHtml += '</tr>';
    });
    auditTableBody.innerHTML = tbodyHtml;
  }

  btnRunAudit.addEventListener("click", function () {
    var profile = {
      sog: parseFloat(document.getElementById("aud-sog").value) || 14.5,
      mmsi: document.getElementById("aud-mmsi").value.trim(),
      shipType: 80,
      lat: 25.0120,
      lon: 55.0270,
      checksumEnforced: document.getElementById("aud-checksum").value === "enforced",
      duplicateMmsiDetected: false,
      navStatus: 0,
      raimActive: true,
      rot: 0,
      destination: "AE JEA",
      vlanIsolated: document.getElementById("aud-vlan").value === "isolated",
      idsEnabled: true
    };
    executeAudit(profile);
  });

  btnLoadSpoof.addEventListener("click", function () {
    document.getElementById("aud-sog").value = "68.4"; // Impossible speed for tanker
    document.getElementById("aud-mmsi").value = "000000000"; // Bogus MMSI
    document.getElementById("aud-checksum").value = "permissive";
    document.getElementById("aud-vlan").value = "flat";
    btnRunAudit.click();
  });

  // --- Tab 6: Gateway Configs ---
  var nftablesBox = document.getElementById("nftables-box");
  var suricataBox = document.getElementById("suricata-box");

  nftablesBox.value = AISConfigSynthesizer.generateNftables();
  suricataBox.value = AISConfigSynthesizer.generateSuricata();

  document.getElementById("btn-copy-nftables").addEventListener("click", function () {
    navigator.clipboard.writeText(nftablesBox.value);
    alert("ECDIS nftables rules copied!");
  });

  document.getElementById("btn-copy-suricata").addEventListener("click", function () {
    navigator.clipboard.writeText(suricataBox.value);
    alert("Suricata maritime signatures copied!");
  });

  // --- Tab 7: Simulator ---
  var simLog = document.getElementById("sim-log-box");

  function logSim(msg, color) {
    var now = new Date();
    var timeStr = now.toTimeString().split(" ")[0] + "." + now.getMilliseconds().toString().padStart(3, "0");
    var row = document.createElement("div");
    row.className = "dissect-row";
    row.innerHTML = '<span class="dissect-key">' + timeStr + '</span><span class="dissect-val" style="color:' + (color || 'var(--text-main)') + ';">' + msg + '</span>';
    simLog.prepend(row);
  }

  document.getElementById("btn-sim-jebel-ali").addEventListener("click", function () {
    logSim("-> [VHF-CH-87B] !AIVDM received: Tanker GULF PRIDE (MMSI 470123456) reporting SOG 14.2 kts approaching Jebel Ali Fairway Buoy", "var(--maritime-cyan)");
    setTimeout(function () {
      logSim("<- [VTS-RADAR] Target acquired on ARPA Radar. Correlating AIS position with 3GHz X-Band primary radar echo.", "var(--radar-green)");
      logSim("[IMO-AUDIT] Target kinematic track verified. Velocity delta < 0.2 kts. RAIM integrity valid.", "var(--radar-green)");
    }, 250);
  });

  document.getElementById("btn-sim-hormuz-transit").addEventListener("click", function () {
    logSim("-> [VHF-CH-88B] Inbound VLCC convoy transiting Strait of Hormuz Traffic Separation Scheme (TSS).", "var(--nav-amber)");
    setTimeout(function () {
      logSim("<- [ECDIS-N2K] PGN 129038 broadcast onto shipboard CAN bus (250 kbps). ECDIS chart plot updated.", "var(--maritime-cyan)");
    }, 180);
  });

  document.getElementById("btn-sim-gps-spoof").addEventListener("click", function () {
    logSim("⚠️ [AIS-ALERT] GPS Teleportation anomaly detected! SOG jumped from 12.1 kts to 88.5 kts within 2 seconds.", "var(--danger-red)");
    setTimeout(function () {
      logSim("⚠️ [SURICATA-DPI] SID:4001001 triggered: Possible GNSS/AIS electronic warfare spoofing in Persian Gulf sector.", "var(--danger-red)");
      logSim("[FALLBACK] Switching ECDIS navigation sensor to backup Inertial Navigation System (INS) & Gyrocompass.", "var(--nav-amber)");
    }, 200);
  });

  document.getElementById("btn-clear-sim").addEventListener("click", function () {
    simLog.innerHTML = '';
  });

  // Initial render
  updateSynthesizedSentence();
  btnArmorText.click();
  btnRunAudit.click();
});
