/* quick-notes.js — compact "Notes Inbox" floating component */
(function () {
  'use strict';

  var STORAGE_KEY = 'quick_notes';
  var _idCounter = 0;

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    _idCounter += 1;
    return Date.now().toString(36) + '-' + _idCounter + '-' + Math.random().toString(36).slice(2, 8);
  }

  function loadNotes() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore corrupt data */ }
    return [];
  }

  function saveNotes(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  /* ---- Migrate from old "notes" key used by script.js ---- */
  function migrateOldNotes() {
    try {
      var old = localStorage.getItem('notes');
      if (!old) return;
      var parsed = JSON.parse(old);
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      var existing = loadNotes();
      var migrated = parsed.map(function (n) {
        return {
          id: generateId(),
          title: n.title || '',
          content: n.content || '',
          timestamp: Date.now()
        };
      });
      saveNotes(existing.concat(migrated));
      localStorage.removeItem('notes');
    } catch (_) { /* ignore */ }
  }

  migrateOldNotes();

  var notes = loadNotes();
  var filterText = '';

  /* ---- DOM refs ---- */
  var fab = document.getElementById('qn-fab');
  var panel = document.getElementById('qn-panel');
  var closeBtn = document.getElementById('qn-close');
  var exportBtn = document.getElementById('qn-export');
  var searchInput = document.getElementById('qn-search');
  var listEl = document.getElementById('qn-list');
  var titleInput = document.getElementById('qn-title');
  var contentInput = document.getElementById('qn-content');
  var addBtn = document.getElementById('qn-add');

  /* ---- Toggle panel ---- */
  fab.addEventListener('click', function () {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      titleInput.focus();
    }
  });
  closeBtn.addEventListener('click', function () {
    panel.classList.remove('open');
  });

  /* ---- Add note ---- */
  addBtn.addEventListener('click', addNote);
  contentInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote();
  });

  function addNote() {
    var title = titleInput.value.trim();
    var content = contentInput.value.trim();
    if (!title && !content) return;
    notes.unshift({
      id: generateId(),
      title: title || 'Untitled',
      content: content,
      timestamp: Date.now()
    });
    saveNotes(notes);
    titleInput.value = '';
    contentInput.value = '';
    render();
    titleInput.focus();
  }

  /* ---- Delete ---- */
  function deleteNote(id) {
    notes = notes.filter(function (n) { return n.id !== id; });
    saveNotes(notes);
    render();
  }

  /* ---- Search / filter ---- */
  searchInput.addEventListener('input', function () {
    filterText = searchInput.value.toLowerCase();
    render();
  });

  /* ---- Export ---- */
  exportBtn.addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'quick-notes.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  /* ---- Render ---- */
  function render() {
    var filtered = notes;
    if (filterText) {
      filtered = notes.filter(function (n) {
        return n.title.toLowerCase().indexOf(filterText) !== -1 ||
               n.content.toLowerCase().indexOf(filterText) !== -1;
      });
    }

    if (filtered.length === 0) {
      listEl.innerHTML = '<p class="qn__empty">' + (filterText ? 'No matching notes.' : 'No notes yet. Add one below!') + '</p>';
      return;
    }

    listEl.innerHTML = '';
    filtered.forEach(function (note) {
      var div = document.createElement('div');
      div.className = 'qn__item';
      div.setAttribute('role', 'article');

      var ts = new Date(note.timestamp);
      var dateStr = ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      var timeStr = ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

      var h4 = document.createElement('h4');
      h4.textContent = note.title;
      var p = document.createElement('p');
      p.textContent = note.content;
      var time = document.createElement('time');
      time.dateTime = ts.toISOString();
      time.textContent = dateStr + ' ' + timeStr;

      var del = document.createElement('button');
      del.className = 'qn__item-del';
      del.setAttribute('aria-label', 'Delete note: ' + note.title);
      del.textContent = '✕';
      del.addEventListener('click', function () { deleteNote(note.id); });

      div.appendChild(h4);
      div.appendChild(p);
      div.appendChild(time);
      div.appendChild(del);
      listEl.appendChild(div);
    });
  }

  render();
})();
