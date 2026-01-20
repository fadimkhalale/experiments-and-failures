let allPDFs = [];
  
  async function loadPDFs() {
    try {
      const response = await fetch('/list');
      allPDFs = await response.json();
      
      // PDFs mit Typen versehen basierend auf dem Dateinamen
      allPDFs = allPDFs.map(pdf => {
        let type = '';
        if (pdf.name.startsWith('Dozentenblatt_')) {
          type = 'Dozentenblatt';
        } else if (pdf.name.startsWith('Zuarbeitsblatt_')) {
          type = 'Zuarbeitsblatt';
        }
        return {...pdf, type};
      });
      
      applyFilters();
    } catch (e) {
      console.log("Fehler:", e);
    }
  }
  
  function applyFilters() {
    const type = document.getElementById('filterType').value;
    const name = document.getElementById('filterName').value.toLowerCase();
    
    const filtered = allPDFs.filter(pdf => {
      const matchesType = !type || pdf.type === type;
      const matchesName = !name || pdf.name.toLowerCase().includes(name);
      return matchesType && matchesName;
    });
    
    renderPDFs(filtered);
  }
  
  function renderPDFs(pdfs) {
    const tbody = document.getElementById('pdfTable');
    tbody.innerHTML = pdfs.map(pdf => `
      <tr class="${pdf.type.toLowerCase().replace('blatt', '')}">
        <td>${pdf.name}</td>
        <td>${pdf.date}</td>
        <td class="action-buttons">
          <button class="delete-btn" data-path="${pdf.path}" data-name="${pdf.name}">Löschen</button>
          <button class="view-btn" data-path="${pdf.path}">Ansehen</button>
          <button class="edit-btn" data-path="${pdf.path}" data-name="${pdf.name}">Umbenennen</button>
        </td>
      </tr>
    `).join('');
  }

  async function deletePDF(path, name) {
    if (confirm(`Möchten Sie die Datei "${name}" wirklich löschen?`)) {
      try {
        const response = await fetch('/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
        });
        
        const result = await response.json();
        if (result.success) {
          loadPDFs(); // Liste neu laden nach erfolgreichem Löschen
        } else {
          alert('Löschen fehlgeschlagen: ' + (result.message || 'Unbekannter Fehler'));
        }
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
        alert('Fehler beim Löschen: ' + error.message);
      }
    }
  }
  
  // Event Listener
  document.getElementById('filterBtn').addEventListener('click', applyFilters);
  
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('view-btn')) {
      window.open(`/view?path=${encodeURIComponent(e.target.dataset.path)}`, '_blank');
    }
    
    if (e.target.classList.contains('edit-btn')) {
      const oldPath = e.target.dataset.path;
      const oldName = e.target.dataset.name;
      const newName = prompt("Neuer Dateiname:", oldName);
      
      if (newName && newName !== oldName) {
        fetch('/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPath, newName })
        }).then(res => res.json())
          .then(data => data.success && loadPDFs());
      }
    }
    
    if (e.target.classList.contains('delete-btn')) {
      const path = e.target.dataset.path;
      const name = e.target.dataset.name;
      deletePDF(path, name);
    }
  });
  
  // Initial laden
  loadPDFs();