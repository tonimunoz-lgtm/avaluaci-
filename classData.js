// classData.js
export async function openClassTab(classId, tabId) {
    const classRef = firebase.firestore().collection('classes').doc(classId);
    const doc = await classRef.get();
    if(!doc.exists) return;

    const data = doc.data();
    const tab = (data.activityTabs || []).find(t => t.id === tabId);
    if(!tab) return;

    // Carregar activitats del tab
    window.classActivities = tab.activitats; // ús global provisional
    window.classStudents = data.alumnes || [];

    // Crida a render de la taula (des de notes.js)
    if(window.renderNotesGrid) window.renderNotesGrid();
}
