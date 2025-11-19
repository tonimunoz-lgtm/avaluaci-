import { openModal, closeModal } from './modals.js';

export function setupClassScreen() {
  const backBtn = document.getElementById('btnBack');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.getElementById('screen-class').style.display = 'none';
      document.getElementById('screen-classes').style.display = 'block';
    });
  }

  renderNotesTable();
  setupStudentsSidebar();
}

function renderNotesTable() {
  const tableWrapper = document.getElementById('notesTable-wrapper');
  if (!tableWrapper) return;

  tableWrapper.innerHTML = `
    <table id="notesTable">
      <thead>
        <tr>
          <th>Alumne</th>
          <th>Nota 1</th>
          <th>Nota 2</th>
          <th>Nota 3</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Joan</td>
          <td><input class="table-input bg-green-100" value="9"></td>
          <td><input class="table-input bg-yellow-100" value="6"></td>
          <td><input class="table-input bg-red-100" value="3"></td>
        </tr>
      </tbody>
    </table>
  `;
}

function setupStudentsSidebar() {
  const container = document.getElementById('studentsListContainer');
  if (!container) return;

  // Exemple dummy d'alumnes
  const students = ['Joan', 'Maria', 'Pere', 'Laia'];
  container.innerHTML = '';
  students.forEach(s => {
    const div = document.createElement('div');
    div.textContent = s;
    container.appendChild(div);
  });
}
