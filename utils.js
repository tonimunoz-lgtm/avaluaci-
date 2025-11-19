export function calculateAverage(grades) {
  if (!grades.length) return 0;
  return grades.reduce((a,b)=>a+b,0)/grades.length;
}

export function gradeColor(value) {
  if (value >= 7) return 'bg-green-100';
  if (value >= 5) return 'bg-yellow-100';
  return 'bg-red-100';
}
