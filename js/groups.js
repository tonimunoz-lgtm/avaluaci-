// /js/groups.js
import { loadStudentsSidebar } from "./students.js";
import { openGrid } from "./grid.js";
import { createElement } from "./ui.js";

let currentClassId = null;
let groups = [];

export function initGroups() {
  document.getElementById("btnAddGroup").addEventListener("click", () => {
    const name = prompt("Nom del nou grup:");
    if (name) createGroup(name);
  });
}

export function showGroupsScreen(classId) {
  currentClassId = classId;
  document.getElementById("appRoot").classList.add("hidden");
  document.getElementById("screen-classes").classList.add("hidden");
  document.getElementById("screen-groups").classList.remove("hidden");

  loadStudentsSidebar(classId, "Groups"); // reutilitza sidebar alumnes
  loadActivityGroups(classId);
}

function loadActivityGroups(classId) {
  // Exemple inicial: si no hi ha grups, crear "avaluació"
  if (!groups.length) groups.push({ id: "avaluació", name: "Avaluació" });
  renderGroups();
}

function renderGroups() {
  const container = document.getElementById("groupsContainer");
  container.innerHTML = "";
  groups.forEach(group => {
    const card = createElement("div", { class: "p-4 rounded shadow bg-gray-100 cursor-pointer" });
    card.textContent = group.name;
    card.addEventListener("click", () => openGrid(currentClassId, group.id));
    container.appendChild(card);
  });
}

function createGroup(name) {
  const id = name.toLowerCase().replace(/\s+/g, "_");
  groups.push({ id, name });
  renderGroups();
}
