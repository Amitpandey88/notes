// Get elements from the DOM
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const addNoteButton = document.getElementById('add-note-btn');
const notesContainer = document.querySelector('.notes-container');

// Event listeners
addNoteButton.addEventListener('click', addNote);

// Notes array to store notes data
let notes = [];

// Add note function
function addNote() {
  // Get input values
  const title = noteTitleInput.value;
  const content = noteContentInput.value;

  // Create new note object
  const note = {
    title,
    content
  };

  // Add new note object to notes array
  notes.push(note);

  // Render notes
  renderNotes();

  // Clear input fields
  noteTitleInput.value = '';
  noteContentInput.value = '';
}

// Render notes function
function renderNotes() {
  // Clear notes container
  notesContainer.innerHTML = '';

  // Loop through notes array and create note elements
  notes.forEach((note, index) => {
    // Create note element
    const noteElement = document.createElement('div');
    noteElement.classList.add('note');
    noteElement.innerHTML = `
      <h2>${note.title}</h2>
      <p>${note.content}</p>
      <button class="delete-note"><i class="material-icons">delete</i></button>
      <button class="edit-note"><i class="material-icons">edit</i></button>
    `;

    // Add event listener to delete note button
    const deleteButton = noteElement.querySelector('.delete-note');
    deleteButton.addEventListener('click', () => {
      // Remove note from notes array
      notes.splice(index, 1);
      // Render notes again
      renderNotes();
    });

    // Add event listener to edit note button
    const editButton = noteElement.querySelector('.edit-note');
    editButton.addEventListener('click', () => {
      // Set input values to current note values
      noteTitleInput.value = note.title;
      noteContentInput.value = note.content;
      // Remove note from notes array
      notes.splice(index, 1);
      // Render notes again
      renderNotes();
    });

    // Add note element to notes container
    notesContainer.appendChild(noteElement);
  });
}
