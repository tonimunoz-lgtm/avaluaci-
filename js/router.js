import { showGroupsScreen } from "./groups.js";

export function initRouter() {
  // Quan es clica una classe
  document.querySelectorAll(".class-card").forEach(card => {
    card.addEventListener("click", () => {
      const classId = card.dataset.id;
      showGroupsScreen(classId);
    });
  });
}
