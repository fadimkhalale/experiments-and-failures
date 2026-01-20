document
  .getElementById("example-dozentenblatt-btn")
  .addEventListener("click", () => {
    document.getElementById("rdf-input").value = JSON.stringify({
      "dozent": {
        "ID": "D12345",
        "titel": "Prof. Dr.",
        "vorname": "Max",
        "nachname": "Mustermann",
        "fakultaet": "FIM",
        "arbeitszeit": "Vollzeit",
        "vollzeitInput": "100%",
        "email": "max.mustermann@htwk-leipzig.de",
        "telefon": "+49 341 1234567",
        "dozentHinweise": "Bitte keine Veranstaltungen am Mittwochvormittag planen",
        "dekanatHinweise": "Raumzuweisung erfolgt nach Kapazität",
        "profUnterschrift": "Prof. Dr. Mustermann",
        "dekanUnterschrift": "Prof. Dr. Schmidt",
        "datumUnterschrift": "15.05.2025",
        "dozententag": "Mittwoch",
        "forschungstag": "Donnerstag",
        "ausnahmeTag": "Freitag Nachmittag",
        "sperrzeit": [
          {
            "wochen": "1-15",
            "wochentag": "Mittwoch",
            "uhrzeit": "08:00-10:00",
            "begruendung": "Forschungstag"
          },
          {
            "wochen": "2-14",
            "wochentag": "Freitag",
            "uhrzeit": "13:00-15:00",
            "begruendung": "Sprechstunde"
          }
        ],
        "einsatzzeit": [
          {
            "wochen": "1-15",
            "wochentag": "Dienstag",
            "uhrzeit": "09:15-10:45",
            "anmerkung": "Vorlesung"
          },
          {
            "wochen": "1-15",
            "wochentag": "Dienstag",
            "uhrzeit": "13:30-15:00",
            "anmerkung": "Seminar"
          }
        ],
        "lehrveranstaltung": [
          {
            "nummer": "1",
            "fakultaet": "FIM",
            "studiengang": "BIB",
            "fs": "3",
            "gruppen": "1-5",
            "modulnr": "1300",
            "modulname": "BAUKO I",
            "swsVorlesung": "2",
            "swsSeminar": "0",
            "swsPraktikum": "0",
            "digital": "nein",
            "bemerkung": "Für alle Gruppen gemeinsam"
          },
          {
            "nummer": "2",
            "fakultaet": "FIM",
            "studiengang": "BIB",
            "fs": "3",
            "gruppen": "1-3",
            "modulnr": "1301",
            "modulname": "BAUKO II",
            "swsVorlesung": "0",
            "swsSeminar": "2",
            "swsPraktikum": "0",
            "digital": "teilweise",
            "bemerkung": "Hybrid-Seminar (wöchentlich wechselnd)"
          }
        ]
      }
    }, null, 2);
    
    if (window.currentTemplate !== "dozent") {
      document.getElementById("switch-template-btn").click();
    }
  });

const formHTML = `
				<div class="container">
					 <div class="zuarbeit-header-box">
	<div class="zuarbeit-header-row">
		<div class="left">
			HTWK Leipzig<br>DS<br>ID: <span id="zuarbeit-id"></span>
		</div>
		<div class="center">
			<strong>Zuarbeit</strong><br>
			<strong>Stunden – Raumplanung</strong>
		</div>
		<div class="right">
			<span id="semester-display"></span><br>
			Präsenzplanung<br>
			(ggf. mit digitalen Anteilen)
		</div>
	</div>
</div>

<p class="planungswochen-display">
	<span id="semester-display"></span>: Planungswochen <span id="planungswochen-display"></span>
</p>

						<div class="section">
								<div class="form-row">
										<div class="form-label">Fakultät</div>
										<div class="form-input" id="fakultaet"></div>
										<div class="form-label" style="margin-left: 5mm;">Studiengang</div>
										<div class="form-input" style="width: 20mm;" id="studiengang"></div>
										<div class="form-label" style="margin-left: 5mm;">Fachsemester</div>
										<div class="form-input" style="width: 10mm;" id="fs"></div>
										<div class="form-label" style="margin-left: 5mm;">Gruppen</div>
										<div class="form-input" style="width: 30mm;" id="gruppen"></div>
								</div>
						</div>

						<div class="section">
								<div class="form-row">
										<div class="form-input" id="modulnr-name" data-label="Nummer und Bezeichnung des Moduls"></div>

								</div>
								<div class="form-row">
									 <div class="form-input" id="lehrveranstaltung" data-label="Nummer und Bezeichnung der Lehrveranstaltung/ des Teilmoduls"></div>

								</div>
						</div>

						<div class="section">
								<table>
										<thead>
												<tr>
														<th colspan="3">Gesamt SWS (bezogen auf einen Beispiel - Studenten):</th>
												</tr>
												<tr>
														<th></th>
														<th>Vorlesung</th>
														<th>Seminar</th>
														<th>Praktikum</th>
												</tr>
										</thead>
										<tbody>
												<tr>
														<td>davon SWS</td>
														<td id="sws-v"></td>
														<td id="sws-s"></td>
														<td id="sws-p"></td>
												</tr>
												<tr>
														<td>Raumanforderung</td>
														<td id="raumV"></td>
														<td id="raumS"></td>
														<td id="raumP"></td>
														
												</tr>
												<tr>
														<td>Technikanforderung (Campus - Bereich)</td>
														<td id="technikV"></td>
														<td id="technikS"></td>
														<td id="technikP"></td>
														
												</tr>
										</tbody>
								</table>

								<div class="notes">
										<p><strong>Hinweis:</strong> 1 SWS = 1 WS (Wochenstunde: 45 min) in jeder Woche des Semesters; geplant werden nur Lehreinheiten: 1 LE=2 WS=90 min</p>
										<p>Sind keine weiteren Erläuterungen vorhanden, wird für den Charakter der LV Präsenz angenommen.</p>
										<p>Weitere Möglichkeiten sind (siehe Hinweise auf Dozentenblatt):</p>
										<p><strong>digital asynchron</strong> (wird nur einmal im Semester im Plan in der Zeit von 07:00-07:30 Uhr eingesetzt),</p>
										<p><strong>digital asynchron mit zeitlicher Begrenzung</strong> (kann bei Bedarf auch mehrmals eingesetzt werden, wenn z.B. die KW definiert ist),</p>
										<p><strong>digital synchron.</strong></p>
								</div>
						</div>

						<div class="section">
								<div class="section-title">Lesende:</div>
								<table id="lesende-table">
										<thead>
												<tr>
														<th>F - Bereich / Titel, Name</th>
														<th>S - Gruppe</th>
														<th>Erläuterung</th>
												</tr>
										</thead>
										<tbody>
												 Rows will be added dynamically
										</tbody>
								</table>

								<div class="notes">
										<p>Geben Sie bitte an, welche Gruppen gemeinsam an einer Vorlesung teilnehmen oder ob für jede Gruppe einzeln gelesen wird.</p>
										<p>Bei mehreren Lesenden bitte die Art der Teilung erläutern:</p>
										<p>z. B. inhaltliche Teilung - die Lesenden übernehmen nacheinander ein bestimmtes Gebiet des Lehrstoffes ordnen Sie bitte die</p>
										<p>entsprechenden Kalenderwochen zu</p>
										<p>quantitative Teilung - jeder Lesende übernimmt eine oder mehrere Seminargruppen, es kann auch parallel geplant werden.</p>
								</div>
						</div>

						<div>

						</div>
						<div>

						</div>
						<div class="section">
								<div class="section-title">Seminarleiter:</div>
								<table id="seminarleiter-table">
										<thead>
												<tr>
														<th>F - Bereich / Titel, Name</th>
														<th>S - Gruppe</th>
														<th>Erläuterung</th>
												</tr>
										</thead>
										<tbody>
												 Rows will be added dynamically
										</tbody>
								</table>

								<div class="notes">
										<p>Bitte geben Sie an, ob die Seminare mit den einzelnen Seminargruppen, in mehreren Gruppen gemeinsam als Hörsaalseminar oder in anderen</p>
										<p>Varianten durchgeführt werden.</p>
								</div>
						</div>

						 
						<div class="page-break"></div>

								<div class="section">
										<div class="section-title">Praktikumsverantwortliche:</div>
										<table id="praktikumsleiter-table">
												<thead>
														<tr>
																<th>F - Bereich / Titel, Name</th>
																<th>S - Gruppe</th>
																<th>Erläuterung</th>
														</tr>
												</thead>
												<tbody>
														 Rows will be added dynamically
												</tbody>
										</table>

										<div class="notes">
												<p>Bitte geben Sie die Art der Praktikumsdurchführung an, eventuelle Teilnehmerzahlen je Veranstaltung, Staffelung der Praktika usw.</p>
										</div>
								</div>

								<div class="section">
										<div class="section-title">Wünsche zur Planung dieser Lehrveranstaltung in den umseitig angegebenen Gruppen:</div>
										<div class="checkbox-group">
												<div class="checkbox-item"><input type="checkbox" id="planung1"> <label for="planung1">gleichmäßige Verteilung von Vorlesungen und Seminaren auf gerade und ungerade Wochen</label></div>
												<div class="checkbox-item"><input type="checkbox" id="planung2"> <label for="planung2">Vorlesungen in der einen und Seminare in der anderen Woche</label></div>
												<div class="checkbox-item"><input type="checkbox" id="planung3"> <label for="planung3">Blockplanung (2 x 90 min hintereinander) von Vorlesungen, Seminaren oder Praktika einer Seminargruppe</label></div>
												<div class="checkbox-item"><input type="checkbox" id="planung4"> <label for="planung4">keine Blockplanung in einer Seminargruppe</label></div>
												<div class="checkbox-item"><input type="checkbox" id="planung5"> <label for="planung5">Vorlesung zwingend vor Seminar</label></div>
										</div>

										<div class="form-row" style="margin-top: 5mm;">
												<div class="form-label">Weitere Planungshinweise:</div>
												<div class="form-input" id="planungshinweise"></div>
										</div>
								</div>

								<div class="section">
										<div class="section-title">Weichen die angegebenen Lehrveranstaltungen vom allgemeinen Rhythmus ab, dann geben Sie unbedingt die konkreten Kalenderwochen zu den Veranstaltungen bzw. Dozenten an!</div>
										<div class="notes">
												<p>Die 15. Lehrveranstaltungswoche ist für Blockveranstaltungen, Prüfungsvorbereitung und Lehrveranstaltungen vorgesehen.</p>
										</div>

													 <div class="kw-grid">
												<div class="kw-item">01. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">02. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">03. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">04. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">05. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">06. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">07. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">08. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">09. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">10. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">11. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">12. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">13. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">14. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">15. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">16. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">17. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">18. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">19. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">20. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">21. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">22. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">23. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">24. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">25. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">26. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">27. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">28. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">29. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">30. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">31. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">32. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">33. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">34. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">35. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">36. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">37. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">38. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">39. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">40. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">41. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">42. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">43. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">44. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">45. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">46. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">47. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">48. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">49. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">50. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">51. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">52. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">53. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">54. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">55. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">56. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">57. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">58. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">59. <span class="form-input" style="width: 15mm;"></span></div>
												<div class="kw-item">60. <span class="form-input" style="width: 15mm;"></span></div>
										</div>
										<div class="container page-break">
										<div class="form-row">
												<div class="form-label">Name</div>
												<div class="form-input" id="kw-name"></div>
										</div>
								</div>

								<div class="section">
										<div class="form-row">
												<div class="form-label">Termin der Rückgabe an die Fakultät:</div>
												<div class="form-input" style="width: 30mm;" id="rueckgabedatum"></div>
												<div class="notes" style="margin-left: 5mm;">(Bei Bedarf von der Fakultät ausfüllen)</div>
										</div>
								</div>

		<div class="signature-area">
										<div class="signature-box">Datum, Unterschrift<br>Verantwortliche/r Professor/in</div>
										<div class="signature-box">Datum, Unterschrift<br>Dekan/in der Fakultät</div>
								</div>
</div>

								<div class="notes">
										<p>Bei Dienstleistung zusätzlich von der bedienenden Fakultät / dem bedienenden Bereich:</p>
								</div>

								<div class="signature-box" style="margin-left: auto;">Datum, Unterschrift<br>Dekan/in der Fakultät / Leiter/in Bereich</div>
						</div>
				</div>
				`;
document.getElementById("form-container").innerHTML = formHTML;
function resetForm() {
  document.getElementById("form-container").innerHTML = formHTML;
  document.getElementById("rdf-input").value = "";
  setupEventListeners();
}
function setupEventListeners() {
  document.getElementById("parse-btn").addEventListener("click", parseRDF);
  document
    .getElementById("generate-pdf")
    .addEventListener("click", generatePDF);
  document.getElementById("reset-form").addEventListener("click", resetForm);
}
setupEventListeners();


function parseJSON() {
  const jsonData = document.getElementById("rdf-input").value;

  if (!jsonData.trim()) {
    alert("Bitte JSON-Daten eingeben!");
    return;
  }

  try {
    const data = JSON.parse(jsonData);
    
    // Check if it's dozent or modul data
    const isDozent = data.dozent !== undefined;
    const jsonDataObj = isDozent ? data.dozent : data.modul;

    if (window.currentTemplate === "zuarbeit" && !isDozent) {
      fillZuarbeitsblatt(jsonDataObj);
    } else if (window.currentTemplate === "dozent" && isDozent) {
      fillDozentenblatt(jsonDataObj);
    } else {
      alert("JSON-Daten passen nicht zum aktuellen Formulartyp!");
      return;
    }

    alert("Formular erfolgreich aus JSON-Daten gefüllt!");
  } catch (error) {
    console.error("Error parsing JSON:", error);
    alert("Fehler beim Parsen der JSON-Daten: " + error.message);
  }
}

function fillZuarbeitsblatt(data) {
  setFieldContent("zuarbeit-id", data.ID);
  setFieldContent("fakultaet", data.fakultaet);
  setFieldContent("studiengang", data.studiengang);
  setFieldContent("fs", data.fs);
  setFieldContent("gruppen", data.gruppen);
  setFieldContent("modulnr-name", `${data.modulnr} ${data.modulname}`);
  setFieldContent("lehrveranstaltung", data.lehrveranstaltung);
  setFieldContent("sws-v", data.swsVorlesung);
  setFieldContent("sws-s", data.swsSeminar);
  setFieldContent("sws-p", data.swsPraktikum);
  setFieldContent("raumV", data.raumV);
  setFieldContent("raumS", data.raumS);
  setFieldContent("raumP", data.raumP);
  setFieldContent("technikV", data.technikV);
  setFieldContent("technikS", data.technikS);
  setFieldContent("technikP", data.technikP);
  setFieldContent("rueckgabedatum", data.rueckgabedatum);
  setFieldContent("planungshinweise", data.planungshinweise);
  
  const signatureInput = document
    .getElementById("signature-name")
    ?.value?.trim();
  setFieldContent("kw-name", signatureInput || data.unterschrift || data.name);
  
  // Handle lesende, seminarleiter, praktikumsleiter
  if (data.lesende) {
    if (Array.isArray(data.lesende)) {
      fillPersonTable("lesende-table", data.lesende);
    } else {
      fillPersonTable("lesende-table", [data.lesende]);
    }
  }
  
  if (data.seminarleiter) {
    if (Array.isArray(data.seminarleiter)) {
      fillPersonTable("seminarleiter-table", data.seminarleiter);
    } else {
      fillPersonTable("seminarleiter-table", [data.seminarleiter]);
    }
  }
  
  if (data.praktikumsleiter) {
    if (Array.isArray(data.praktikumsleiter)) {
      fillPersonTable("praktikumsleiter-table", data.praktikumsleiter);
    } else {
      fillPersonTable("praktikumsleiter-table", [data.praktikumsleiter]);
    }
  }
  
  if (data.planungshinweise) {
    const hints = data.planungshinweise.toLowerCase();
    setCheckbox("planung1", hints.includes("gleichmäßige"));
    setCheckbox("planung2", hints.includes("vorlesungen in der einen"));
    setCheckbox("planung3", hints.includes("blockplanung"));
    setCheckbox("planung4", hints.includes("keine blockplanung"));
    setCheckbox("planung5", hints.includes("vorlesung zwingend"));
  }
  
  if (data.kwHinweise) {
    const kwInputs = document.querySelectorAll(".kw-grid .form-input");
    const kwList = data.kwHinweise.split(",");
    kwList.forEach((kw) => {
      const kwNum = kw.trim().replace("KW", "").replace(".", "");
      const input = Array.from(kwInputs).find((i) =>
        i.previousSibling.textContent.trim().startsWith(kwNum)
      );
      if (input) {
        input.textContent = data.name || "X";
      }
    });
  }
  
  document.querySelectorAll(".signature-box").forEach((box) => {
    if (box.textContent.includes("Professor/in")) {
      box.innerHTML = `Datum: ${
        data.datumUnterschrift || ""
      }<br>Unterschrift: ${
        data.profUnterschrift || ""
      }<br>Verantwortliche/r Professor/in`;
    } else if (box.textContent.includes("Dekan/in")) {
      box.innerHTML = `Datum: ${
        data.datumUnterschrift || ""
      }<br>Unterschrift: ${
        data.dekanUnterschrift || ""
      }<br>Dekan/in der Fakultät`;
    }
  });
}

function fillDozentenblatt(data) {
  setFieldContent("dozent-id", data.ID);
  setFieldContent("dozent-id-anlage", data.ID);
  setFieldContent("titel", data.titel);
  setFieldContent("vorname", data.vorname);
  setFieldContent("nachname", data.nachname);
  setFieldContent("email", data.email);
  setFieldContent("telefon", data.telefon);
  setFieldContent("hinweise", data.hinweise);
  setFieldContent("dozent-hinweise", data.hinweise || data.dozentHinweise);
  setFieldContent("dekanat-hinweise", data.dekanatHinweise);
  
  if (data.fakultaet) {
    const checkbox = document.querySelector(
      `#fakultaet-group input[value="${data.fakultaet}"]`
    );
    if (checkbox) checkbox.checked = true;
  }
  
  if (data.arbeitszeit) {
    const isFulltime = data.arbeitszeit.toLowerCase().includes("vollzeit");
    document.getElementById(
      isFulltime ? "fulltime" : "parttime"
    ).checked = true;

    if (isFulltime && data.vollzeitInput) {
      setFieldContent("vollzeit-input", data.vollzeitInput);
    }
  }
  
  const lvTable = document.querySelector("#lehrveranstaltungen tbody");
  if (lvTable && data.lehrveranstaltung) {
    lvTable.innerHTML = "";
    data.lehrveranstaltung.forEach((lv, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${lv.fakultaet || ""}</td>
        <td>${lv.studiengang || ""}</td>
        <td>${lv.fs || ""}</td>
        <td>${lv.gruppen || ""}</td>
        <td>${lv.modulnr || ""}</td>
        <td>${lv.modulname || ""}</td>
        <td>${lv.swsVorlesung || "0"}</td>
        <td>${lv.swsSeminar || "0"}</td>
        <td>${lv.swsPraktikum || "0"}</td>
        <td>${lv.digital || ""}</td>
        <td>${lv.bemerkung || ""}</td>
      `;
      lvTable.appendChild(row);
    });
  }
  
  setFieldContent("anlage-titel", data.titel);
  setFieldContent("anlage-vorname", data.vorname);
  setFieldContent("anlage-nachname", data.nachname);
  
  const einsatzzeitenTable = document.querySelector("#einsatzzeiten tbody");
  if (einsatzzeitenTable && data.einsatzzeit) {
    einsatzzeitenTable.innerHTML = "";
    data.einsatzzeit.forEach((einsatz) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${einsatz.wochen || ""}</td>
        <td>${einsatz.wochentag || ""}</td>
        <td>${einsatz.uhrzeit || ""}</td>
        <td>${einsatz.anmerkung || ""}</td>
      `;
      einsatzzeitenTable.appendChild(row);
    });
  }
  
  const sperrzeitenTable = document.querySelector("#sperrzeiten tbody");
  if (sperrzeitenTable && data.sperrzeit) {
    sperrzeitenTable.innerHTML = "";
    data.sperrzeit.forEach((sperre) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${sperre.wochen || ""}</td>
        <td>${sperre.wochentag || ""}</td>
        <td>${sperre.uhrzeit || ""}</td>
        <td>${sperre.begruendung || ""}</td>
      `;
      sperrzeitenTable.appendChild(row);
    });
  }
  
  if (data.dozententag || data.forschungstag) {
    document
      .querySelectorAll('.time-table input[type="checkbox"]')
      .forEach((cb) => {
        cb.checked = false;
      });

    const checkboxContainer = document.querySelector(
      ".time-table tbody tr:first-child"
    );
    if (checkboxContainer) {
      const cells = checkboxContainer.querySelectorAll("td");
      cells.forEach((cell) => {
        const day = cell.textContent.trim().toLowerCase();
        if (data.dozententag && day === data.dozententag.toLowerCase()) {
          const checkbox = cell.querySelector('input[value="D"]');
          if (checkbox) checkbox.checked = true;
        }
        if (data.forschungstag && day === data.forschungstag.toLowerCase()) {
          const checkbox = cell.querySelector('input[value="F"]');
          if (checkbox) checkbox.checked = true;
        }
      });
    }

    if (data.ausnahmeTag) {
      const ausnahmeField = document.querySelector(
        ".time-table tbody tr:last-child td span.form-input"
      );
      if (ausnahmeField) ausnahmeField.textContent = data.ausnahmeTag;
    }
  }
  
  document.querySelectorAll(".signature-box").forEach((box) => {
    if (box.textContent.includes("Professor/in")) {
      box.innerHTML = `Datum: ${
        data.datumUnterschrift || ""
      }<br>Unterschrift: ${
        data.profUnterschrift || ""
      }<br>Verantwortliche/r Professor/in`;
    } else if (box.textContent.includes("Dekan/in")) {
      box.innerHTML = `Datum: ${
        data.datumUnterschrift || ""
      }<br>Unterschrift: ${
        data.dekanUnterschrift || ""
      }<br>Dekan/in der Fakultät`;
    }
  });
}

function setFieldContent(id, content) {
  const el = document.getElementById(id);
  if (el) el.textContent = content || "";
}

// --
// Function
// --
function fillPersonTable(tableId, persons) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (tbody) {
    tbody.innerHTML = "";
    persons.forEach((person) => {
      const row = document.createElement("tr");
      row.innerHTML = `
								<td>${person.titel || ""} ${person.name || ""}</td>
								<td>${person.gruppen || ""}</td>
								<td>${person.erlaeuterung || ""}</td>
						`;
      tbody.appendChild(row);
    });
  }
}

// --
// Function
// --
function setCheckbox(id, checked) {
  const checkbox = document.getElementById(id);
  if (checkbox) checkbox.checked = checked;
}

// --
// Function
// --
function getPDFFilename(isZuarbeit) {
  const nameField = isZuarbeit ? "kw-name" : "nachname";
  const nameElement = document.getElementById(nameField);
  const name = nameElement?.textContent?.trim() || "unbekannt";
  const prefix = isZuarbeit ? "Zuarbeitsblatt_" : "Dozentenblatt_";
  return `${prefix}${name}_${getCurrentSemester()}.pdf`;
}

// --
// Function
// --
function getCanvasOptions(isZuarbeit) {
  return {
    scale: 2,
    scrollY: 0,
    ignoreElements: (el) => {
      return (
        el.classList.contains("clear-signature") ||
        el.classList.contains("no-export")
      );
    },
    onclone: (clonedDoc) => {
      if (!isZuarbeit) {
        const dateFields = clonedDoc.querySelectorAll(".date-field");
        dateFields.forEach((field) => {
          if (!field.textContent.trim()) {
            field.textContent = new Date().toLocaleDateString("de-DE");
          }
        });
      }
    },
  };
}

// --
// Function
// --
function hideElementsDuringPDFGeneration() {
  document.querySelectorAll(".clear-signature, .no-export").forEach((el) => {
    el.style.visibility = "hidden";
  });
}

// --
// Function
// --
function showElementsAfterPDFGeneration() {
  document.querySelectorAll(".clear-signature, .no-export").forEach((el) => {
    el.style.visibility = "visible";
  });
}

// --
// Function
// --
function getCurrentSemester() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return month >= 4 && month <= 9 ? `SoSe_${year}` : `WiSe_${year}_${year + 1}`;
}

// --
// Function
// --
function getCurrentSemester() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (month >= 4 && month <= 9) {
    return `Sommersemester ${year}`;
  } else {
    return `Wintersemester ${year}/${year + 1}`;
  }
}
window.window.currentTemplate = window.window.currentTemplate || "zuarbeit";
window.window.zuarbeitHTML =
  window.window.zuarbeitHTML ||
  document.getElementById("form-container").innerHTML;

// --
// Function
// --
function switchTemplate() {
  const btn = document.getElementById("switch-template-btn");
  const container = document.getElementById("form-container");

  if (window.currentTemplate === "zuarbeit") {
    container.innerHTML = `
				<div class="container">
<div class="dozenten-header-box">
	<div class="dozenten-header-row">
		<div class="left">
			HTWK Leipzig<br>DS<br>ID: <span id="dozent-id"></span>
		</div>
		<div class="center">
			<strong>Dozentenblatt</strong>
		</div>
		<div class="right">
			<span id="semester-display"></span><br>
			Präsenzplanung<br>
			(ggf. mit digitalen Anteilen)
		</div>
	</div>
</div>
<p class="dozenten-note">Jeder Lehrende füllt bitte nur <u><strong>ein</strong></u> Dozentenblatt aus!</p>

						<div class="section">
								<div class="form-row">
										<div class="form-label">Titel</div>
										<div class="form-input" style="width: 20mm;" id="titel"></div>
										<div class="form-label" style="width: 20mm; margin-left: 5mm;">Vorname</div>
										<div class="form-input" style="flex-grow: 1;" id="vorname"></div>
										<div class="form-label" style="width: 20mm; margin-left: 5mm;">Name</div>
										<div class="form-input" style="flex-grow: 1;" id="nachname"></div>
								</div>
						</div>

						<div class="section">
								<div class="form-row">
										<div class="form-label">Fakultät/Bereich:</div>
										<div class="checkbox-group" id="fakultaet-group">
												<div class="checkbox-item"><input type="checkbox" value="FAS"> FAS</div>
												<div class="checkbox-item"><input type="checkbox" value="FB"> FB</div>
												<div class="checkbox-item"><input type="checkbox" value="FDIT"> FDIT</div>
												<div class="checkbox-item"><input type="checkbox" value="FIM"> FIM</div>
												<div class="checkbox-item"><input type="checkbox" value="FING"> FING</div>
												<div class="checkbox-item"><input type="checkbox" value="FWW"> FWW</div>
												<div class="checkbox-item"><input type="checkbox" value="HSZ"> HSZ</div>
												<div class="checkbox-item"><input type="checkbox" value="MNZ"> MNZ</div>
												<div class="checkbox-item"><input type="checkbox" value="Gast"> Gast</div>
												<div class="checkbox-item"><input type="checkbox" value="HonProf"> HonProf</div>
										</div>
								</div>
						</div>

						<div class="section">
								<div class="form-row">
										<div class="form-label">Arbeitszeit (Pflichtangabe, außer Gast)</div>
										<div class="radio-group">
												<div class="radio-item">
														<input type="radio" name="work_time" id="fulltime"> <label for="fulltime">Vollzeit</label>
														<span class="form-input" style="width: 10mm; margin-left: 2mm;" id="vollzeit-input"></span>
												</div>
												<div class="radio-item">
														<input type="radio" name="work_time" id="parttime"> <label for="parttime">Teilzeit</label>
														<span class="form-input" style="width: 10mm; margin-left: 2mm;" id="teilzeit-input"></span>
												</div>
										</div>
								</div>
						</div>

						<div class="section">
								<div class="form-row">
										<div class="form-label">E-Mailadresse (Pflichtangabe)</div>
										<div class="form-input" id="email"></div>
								</div>
								<div class="form-row">
										<div class="form-label">Telefonisch erreichbar unter (optional)</div>
										<div class="form-input" id="telefon"></div>
								</div>
						</div>

						<div class="section">
								<div class="section-title">Bitte geben Sie in der Tabelle Ihre Einsätze (auch Bedienfunktionen) an!</div>
								<div class="section-title">Durchzuführende Lehrveranstaltungen</div>

								<table id="lehrveranstaltungen">
										<thead>
												<tr>
														<th>Ifd. Nr.</th>
														<th>Fak</th>
														<th>Stg.</th>
														<th>FS</th>
														<th>Gruppen</th>
														<th>Modulnr./ LE</th>
														<th>Modulname (Kürzel)</th>
														<th colspan="3">Reale SWS (Präsenz)</th>
														<th>Digital</th>
														<th>Bemerkung</th>
												</tr>
												<tr>
														<th></th>
														<th></th>
														<th></th>
														<th></th>
														<th></th>
														<th></th>
														<th></th>
														<th>V</th>
														<th>S</th>
														<th>P</th>
														<th></th>
														<th></th>
												</tr>
										</thead>
										<tbody>
												 Rows will be added dynamically
										</tbody>
								</table>

								<div class="notes">
										<p>Reale SWS = tatsächlich zu realisierende SWS</p>
										<p>Beispiel: 2 SWS Seminar für 5 SG BIB einzeln durchgeführt ergibt 10 zu realisierende SWS</p>
										<p>oder</p>
										<p>2 SWS Vorlesung für 5 SG BIB, in 2 Blöcken mit jeweils 3 bzw. 2 SG durchgeführt, ergibt 4 zu realisierende SWS</p>
										<p>Zu jedem aufgeführten Modul/Teilmodul muss ein Zuarbeitsbogen ausgefüllt werden.</p>
								</div>
						</div>

						<div class="section">
								<div class="section-title">Hinweise zum Stundenplan:</div>
								<ul>
										<li>Wahlobligatorische Veranstaltungen werden in der ersten Planungsrunde geplant, wenn die Zahl der teilnehmenden Studenten vorliegt und größer als 9 ist. Fakultative und restliche wahlobligatorische Veranstaltungen werden nach Fertigstellung der Pläne in Absprache mit der Fakultät eingefügt.</li>
										<li>Da Doppelplanung der Dozenten nicht möglich ist, ist es notwendig, die Lehrkraft zu benennen, die die Lehrveranstaltung wirklich durchführt (z.B. Seminarleiter, Praktikumsbetreuer).</li>
								</ul>

								<div class="section-title">Lehrformen: Präsenz (mit digitalen Anteilen, wenn didaktisch vorteilhaft)</div>
								<ul>
										<li>Regelfall: Präsenz (es wird empfohlen, bei Bedarf eine virtuelle Teilnahme zu ermöglichen (hybride LV))</li>
										<li>Digital synchron (Wegezeiten für Studierende beachten)</li>
										<li>Digital asynchron</li>
								</ul>

								<div class="section-title">Digitale Lehre steht unter dem Genehmigungsvorbehalt des Dekans und bedarf der vorherigen Vorlage eines Lehrkonzeptes.</div>
								<div class="section-title">Der digitale Lehranteil darf pro Modul pro Semester max. 50% ausmachen. Für die Genehmigung und Anrechnung auf das Lehrdeputat sind Mindeststandards zu beachten (siehe Hinweise zu digitaler Lehre an der HTWK Leipzig, Kapitel 4.1).</div>
								<div class="section-title">Ferner steht jedwede digitale Lehre unter dem Ermöglichungsvorbehalt der Stunden- und Raumplanung.</div>
						</div>

<div class="section">
<div style="margin-bottom: 5mm;">
				<div><strong>Nach Möglichkeit ist folgender Dozenten-/Forschungstag einzuplanen:</strong> (nur bei <strong>Vollzeit</strong> angeben!)</div>
				<div>Die gewünschten Dozenten- und Forschungstage sind als Anlage 1 zum Dozentenblatt in der Fakultät einzureichen.</div>
				<div>Nach Prüfung werden diese zentral an DS übermittelt.</div>
		</div>

		<div style="margin-bottom: 5mm;">
				<div><strong>Notwendige Sperrzeiten sind:</strong> (nur bei <strong>Gästen</strong> und <strong>Teilzeit!</strong>)</div>
				<div>Die notwendigen Sperrzeiten sind als Anlage 1 zum Dozentenblatt in der Fakultät einzureichen.</div>
				<div>Nach Prüfung werden diese zentral an DS übermittelt.</div>
		</div>

	 <table class="form-table" style="width: 100%; margin-top: 5mm; border-collapse: collapse;">
		<tr>
				<th style="border: 1px solid #000; padding: 2mm; text-align: left; width: 50%;">Bei Bedarf vom Dozenten auszufüllen</th>
				<th style="border: 1px solid #000; padding: 2mm; text-align: left; width: 50%;">Nur vom Dekanat / Studienamt auszufüllen!</th>
		</tr>
		<tr>
				<td style="border: 1px solid #000; padding: 2mm; vertical-align: top;">
						<div><strong>Wichtige Hinweise zur Semesterplanung:</strong> <span id="dozent-hinweise"></span></div>
						<div style="height: 10mm;"></div>
				</td>
				<td style="border: 1px solid #000; padding: 2mm; vertical-align: top;">
						<div><strong>Hinweise bei Rückgabe an den Dozenten:</strong></div>
						<div id="dekanat-hinweise" style="height: 15mm;"></div>
				</td>
		</tr>
</table>
</div>

		 <div class="signature-area">
										<div class="signature-box">Datum, Unterschrift<br>Verantwortliche/r Professor/in</div>
										<div class="signature-box">Datum, Unterschrift<br>Dekan/in der Fakultät</div>
								</div>
</div>
				</div>

<!-- Page 2 - Anlage 1-->
				
				<div class="container page-break">
						<div class="dozenten-header-box">
								<div class="dozenten-header-row">
										<div class="left">
												HTWK Leipzig<br>DS<br>ID: <span id="dozent-id-anlage"></span>
										</div>
										<div class="center">
												<strong>Anlage 1 zum Dozentenblatt</strong>
										</div>
										<div class="right">
												
										</div>
								</div>
						</div>

						<div class="section">
								<div class="form-row">
										<div class="form-label">Titel</div>
										<div class="form-input" style="width: 20mm;" id="anlage-titel"></div>
										<div class="form-label" style="width: 20mm; margin-left: 5mm;">Vorname</div>
										<div class="form-input" style="flex-grow: 1;" id="anlage-vorname"></div>
										<div class="form-label" style="width: 20mm; margin-left: 5mm;">Name</div>
										<div class="form-input" style="flex-grow: 1;" id="anlage-nachname"></div>
								</div>
						</div>

						<div class="section">
								<div class="section-title">Regelmäßig mögliche Einsatzzeiten für externe Dozenten sind:</div>
								<table class="time-table" id="einsatzzeiten">
										<thead>
												<tr>
														<th colspan="3">Zeitangabe</th>
														<th>Anmerkung</th>
												</tr>
												<tr>
														<th>Wochen</th>
														<th>Wochentag</th>
														<th>Uhrzeit</th>
														<th></th>
												</tr>
										</thead>
										<tbody>
												 Rows will be added dynamically
										</tbody>
								</table>
						</div>

						<div class="section">
								<div class="section-title">Notwendige regelmäßige Sperrzeiten für interne Dozenten sind:</div>
								<table class="time-table" id="sperrzeiten">
										<thead>
												<tr>
														<th colspan="3">Zeitangabe</th>
														<th>Begründung</th>
												</tr>
												<tr>
														<th>Wochen</th>
														<th>Wochentag</th>
														<th>Uhrzeit</th>
														<th></th>
												</tr>
										</thead>
										<tbody>
												 Rows will be added dynamically
										</tbody>
								</table>
						</div>

						<div class="section">
								<div class="section-title">Nach Möglichkeit ist folgender Dozenten-/Forschungstag einzuplanen: (nur bei Vollzeit angeben!)</div>
								<table class="time-table">
										<thead>
												<tr>
														<th>Tag ist egal</th>
														<th>Montag</th>
														<th>Dienstag</th>
														<th>Mittwoch</th>
														<th>Donnerstag</th>
														<th>Freitag</th>
												</tr>
										</thead>
										<tbody>
												<tr>
														<td>
																<div class="checkbox-item"><input type="checkbox"> D</div>
																<div class="checkbox-item"><input type="checkbox"> F</div>
														</td>
														<td>
																<div class="checkbox-item"><input type="checkbox"> D</div>
																<div class="checkbox-item"><input type="checkbox"> F</div>
														</td>
														<td>
																<div class="checkbox-item"><input type="checkbox"> D</div>
																<div class="checkbox-item"><input type="checkbox"> F</div>
														</td>
														<td>
																<div class="checkbox-item"><input type="checkbox"> D</div>
																<div class="checkbox-item"><input type="checkbox"> F</div>
														</td>
														<td>
																<div class="checkbox-item"><input type="checkbox"> D</div>
																<div class="checkbox-item"><input type="checkbox"> F</div>
														</td>
														<td>
																<div class="checkbox-item"><input type="checkbox"> D</div>
																<div class="checkbox-item"><input type="checkbox"> F</div>
														</td>
												</tr>
												<tr>
														<td colspan="6">aber nicht: <span class="form-input" style="width: 100mm;"></span></td>
												</tr>
										</tbody>
								</table>
								<div class="notes">
										<p>Hinweis: D – Dozententag; F – Forschungstag → jeweils nur einmal auswählen!</p>
								</div>
						</div>

				 <div class="signature-area">
										<div class="signature-box">Datum, Unterschrift<br>Verantwortliche/r Professor/in</div>
										<div class="signature-box">Datum, Unterschrift<br>Dekan/in der Fakultät</div>
								</div>
				</div>
				`;
    window.currentTemplate = "dozent";
    btn.textContent = "Wechsel zu Zuarbeitsblatt";
  } else {
    container.innerHTML = window.zuarbeitHTML;
    window.currentTemplate = "zuarbeit";
    btn.textContent = "Wechsel zu Dozentenblatt";
  }
  setupEventListeners();
}

// --
// Function
// --
function updatePlanungswochenText() {
  if (window.currentTemplate !== "zuarbeit") return;
  const planungswochen =
    document.getElementById("planungswochen")?.value || "42–58";
  document.querySelectorAll("#planungswochen-display").forEach((el) => {
    el.textContent = planungswochen;
  });
}

// --
// Function
// --
function updateSemesterText() {
  const art =
    document.getElementById("semester-art")?.value || "Wintersemester";
  const jahr = document.getElementById("semester-jahr")?.value || "2025/26";
  const semesterText = `${art} ${jahr}`;
  document.querySelectorAll("#semester-display").forEach((el) => {
    el.textContent = semesterText;
  });
}
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("planungswochen")
    ?.addEventListener("input", updatePlanungswochenText);
  document
    .getElementById("semester-art")
    ?.addEventListener("change", updateSemesterText);
  document
    .getElementById("semester-jahr")
    ?.addEventListener("input", updateSemesterText);
  document.getElementById("body-root").className = currentTemplate;
  updateSemesterText();
  updatePlanungswochenText();
});

// --
// Function
// --
function generatePDF() {
  const element = document.getElementById("form-container");
  const opt = {
    margin: 0,
    filename: (() => {
      const isZuarbeit = window.currentTemplate === "zuarbeit";
      const name = (
        document.getElementById(isZuarbeit ? "kw-name" : "nachname")
          ?.textContent || "unbekannt"
      ).trim();
      const prefix = isZuarbeit ? "Zuarbeitsblatt_" : "Dozentenblatt_";
      return `${prefix}${name || "unbekannt"}.pdf`;
    })(),
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      scrollY: 0,
      onclone: function (clonedDoc) {
        const elementsToProtect = [
          ".section",
          "table",
          "tr",
          "td",
          "th",
          ".text-block",
          ".notes",
          ".form-row",
          ".checkbox-group",
          "ul",
          "ol",
          "li",
          ".signature-area",
          ".signature-box",
          ".zuarbeit-header-box",
          ".planungswochen-display",
        ];

        elementsToProtect.forEach((selector) => {
          clonedDoc.querySelectorAll(selector).forEach((el) => {
            el.style.pageBreakInside = "avoid";
            el.style.breakInside = "avoid";
            if (selector === "table") {
              el.style.display = "table";
              el.style.width = "100%";
            }
            if (selector === "tr") {
              el.style.display = "table-row";
            }
          });
        });
        clonedDoc.querySelectorAll("table").forEach((table) => {
          table.style.maxWidth = "190mm";
        });
        clonedDoc.querySelectorAll("p, li, .text-block").forEach((el) => {
          el.style.widows = "3";
          el.style.orphans = "3";
        });
      },
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  html2pdf().set(opt).from(element).save();
}

// Update event listener setup
function setupEventListeners() {
  document.getElementById("parse-btn").addEventListener("click", parseJSON);
  document
    .getElementById("generate-pdf")
    .addEventListener("click", generatePDF);
  document.getElementById("reset-form").addEventListener("click", resetForm);
}

// Update example button for Zuarbeitsblatt
document.addEventListener("DOMContentLoaded", () => {
  const exampleBtn = document.getElementById("example-btn");
  if (exampleBtn) {
    exampleBtn.addEventListener("click", () => {
      document.getElementById("rdf-input").value = JSON.stringify({
        "modul": {
          "ID": "Z12345",
          "fakultaet": "FIM",
          "studiengang": "BIB",
          "fs": "3",
          "gruppen": "13 BIB 1 - 5",
          "modulnr": "1300",
          "modulname": "BAUKO I",
          "lehrveranstaltung": "Einführung in die Bibliothekswissenschaft",
          "swsVorlesung": "2",
          "swsSeminar": "1",
          "swsPraktikum": "2",
          "raumV": "Hörsaal 123",
          "raumS": "Seminarraum 45",
          "raumP": "Labor 67",
          "technikV": "Beamer, PC",
          "technikS": "Whiteboard",
          "technikP": "Spezialausrüstung",
          "planungshinweise": "Gleichmäßige Verteilung auf gerade/ungerade Wochen, Vorlesung zwingend vor Seminar",
          "kwHinweise": "KW42, KW43, KW44, KW45, KW46, KW47, KW48, KW49, KW50, KW51, KW52, KW01, KW02, KW03, KW04, KW05, KW06",
          "name": "Prof. Dr. Müller",
          "unterschrift": "Fadi Mkhalale",
          "rueckgabedatum": "15.05.2025",
          "profUnterschrift": "Prof. Dr. Mustermann",
          "dekanUnterschrift": "Prof. Dr. Schmidt",
          "datumUnterschrift": "15.05.2025",
          "lesende": {
            "titel": "Prof. Dr.",
            "name": "Schmidt",
            "gruppen": "1-5",
            "erlaeuterung": "Gemeinsame Vorlesung für alle Gruppen, montags 09:15-10:45 Uhr"
          },
          "seminarleiter": [
            {
              "titel": "Dr.",
              "name": "Meier",
              "gruppen": "1-3",
              "erlaeuterung": "Seminar in 2 Gruppen, Blockveranstaltung gerader Wochen, Dienstag 13:30-17:00 Uhr"
            },
            {
              "titel": "M.Sc.",
              "name": "Schulze",
              "gruppen": "4-5",
              "erlaeuterung": "Seminar in 2 Gruppen, Blockveranstaltung ungerader Wochen, Mittwoch 13:30-17:00 Uhr"
            }
          ],
          "praktikumsleiter": {
            "titel": "",
            "name": "Wagner",
            "gruppen": "1-5",
            "erlaeuterung": "Praktikum in Einzelgruppen, wöchentlich wechselnd: Gruppe 1+2 (KW42,44,...), Gruppe 3+4 (KW43,45,...), Gruppe 5 (flexibel)"
          }
        }
      }, null, 2);
    });
  }
});

// frontend: dynamisches Laden / Übernehmen gespeicherter JSONs
(async function initSavedJsonUI() {
  const select = document.getElementById('saved-dozenten');
  const input = document.getElementById('dozenten-input');
  const loadBtn = document.getElementById('load-saved-btn');
  const refreshBtn = document.getElementById('refresh-saved-btn');
  const rdfTextarea = document.getElementById('rdf-input');

  async function fetchList() {
    try {
      const r = await fetch('/api/json-list');
      const list = await r.json();
      return list;
    } catch (err) {
      console.error('Fehler beim Laden der Liste', err);
      return [];
    }
  }

  function populateSelect(list) {
    // clear existing options except the first placeholder
    select.innerHTML = '<option value="">-- keine ausgewählt --</option>';
    for (const item of list) {
      // use ID as shown name (as requested) but keep filename as value
      const opt = document.createElement('option');
      opt.value = item.filename;
      opt.textContent = item.id;
      select.appendChild(opt);
    }
  }

  async function refreshList() {
    const list = await fetchList();
    populateSelect(list);
  }

  // initial load
  refreshList();

  // refresh button
  refreshBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    refreshList();
  });

  // load button: determine source (select value / input value) and load JSON into rdf-input
  loadBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const selectedFilename = select.value;
    const typed = (input.value || '').trim();

    try {
      let data = null;

      if (selectedFilename) {
        // load by filename
        const r = await fetch('/api/json-file/' + encodeURIComponent(selectedFilename));
        if (!r.ok) throw new Error('Datei konnte nicht geladen werden');
        data = await r.json();
      } else if (typed) {
        // try to load by ID first
        const r = await fetch('/api/json-by-id/' + encodeURIComponent(typed));
        if (r.ok) {
          const j = await r.json();
          // endpoint returns { filename, data }
          data = j.data || j;
        } else {
          // fallback: user typed a filename (with or without .json)
          let tryName = typed.endsWith('.json') ? typed : typed + '.json';
          const r2 = await fetch('/api/json-file/' + encodeURIComponent(tryName));
          if (r2.ok) data = await r2.json();
          else throw new Error('Keine passende Datei/ID gefunden');
        }
      } else {
        alert('Bitte eine Datei auswählen oder eine ID eingeben.');
        return;
      }

      // put pretty-printed JSON into textarea
      rdfTextarea.value = JSON.stringify(data, null, 2);

      // optional: trigger any parsing/display logic you already have
      // z.B. parseBtn.click() falls du das automatisch füllen möchtest
      // document.getElementById('parse-btn')?.click();

    } catch (err) {
      console.error(err);
      alert('Fehler beim Laden der JSON: ' + (err.message || err));
    }
  });
})();


async function loadSelectedIntoTextarea() {
  const dozentSel = document.getElementById("saved-dozenten");
  const zuarbeitSel = document.getElementById("saved-zuarbeit");
  if (!dozentSel || !zuarbeitSel)
    return alert("Fehlende UI-Elemente für gespeicherte JSON-Daten.");

  const sel = dozentSel.value || zuarbeitSel.value;
  if (!sel) return alert("Bitte zunächst ein gespeichertes JSON auswählen.");

  const [file, id] = sel.split("||");
  try {
    const res = await fetch(
      `/json/get?file=${encodeURIComponent(file)}&id=${encodeURIComponent(id)}`
    );
    if (!res.ok) throw new Error("JSON nicht gefunden");
    const jsonData = await res.json();
    const rdfInput = document.getElementById("rdf-input");
    if (!rdfInput) return alert("rdf-input nicht gefunden.");
    
    // Create appropriate JSON structure based on type
    let jsonToDisplay;
    if (file.includes('dozentenblatt')) {
      jsonToDisplay = { dozent: jsonData };
    } else if (file.includes('zuarbeitsblatt')) {
      jsonToDisplay = { modul: jsonData };
    } else {
      jsonToDisplay = jsonData;
    }
    
    rdfInput.value = JSON.stringify(jsonToDisplay, null, 2);
    
    if (typeof switchTemplate === "function") {
      const wantDozent = file.toLowerCase().includes("dozenten");
      const wantZuar =
        file.toLowerCase().includes("zuarbeit") ||
        file.toLowerCase().includes("zuarbeits");
      if (typeof window.currentTemplate !== "undefined") {
        if (wantDozent && window.currentTemplate !== "dozent") switchTemplate();
        if (wantZuar && window.currentTemplate !== "zuarbeit") switchTemplate();
      } else {
        if (wantDozent) switchTemplate();
        if (wantZuar) switchTemplate();
      }
    }
  } catch (err) {
    console.error("loadSelectedIntoTextarea error:", err);
    alert("Konnte JSON nicht laden: " + (err.message || err));
  }
}