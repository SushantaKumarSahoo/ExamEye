// Utility functions for exam status management

export function getExamStatus(exam) {
  const now = new Date();
  const startTime = new Date(exam.startTime);
  const endTime = new Date(exam.endTime);

  if (now < startTime) {
    return 'scheduled';
  } else if (now >= startTime && now < endTime) {
    return 'active';
  } else {
    return 'ended';
  }
}

export function formatDateTimeIST(date) {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function isExamEditable(exam) {
  const now = new Date();
  const startTime = new Date(exam.startTime);
  return now < startTime; // Can edit only before exam starts
}

export function canDeleteExam(exam) {
  const now = new Date();
  const startTime = new Date(exam.startTime);
  return now < startTime; // Can delete only before exam starts
}

export function canEndExam(exam) {
  const now = new Date();
  const startTime = new Date(exam.startTime);
  const endTime = new Date(exam.endTime);
  return now >= startTime && now < endTime; // Can end only during exam
}

export function canRemoveExam(exam) {
  const now = new Date();
  const endTime = new Date(exam.endTime);
  return now > endTime; // Can remove only after exam has ended
}

export function getTimeUntilStart(exam) {
  const now = new Date();
  const startTime = new Date(exam.startTime);
  const diff = startTime - now;
  
  if (diff <= 0) return null;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getTimeRemaining(exam) {
  const now = new Date();
  const endTime = new Date(exam.endTime);
  const diff = endTime - now;
  
  if (diff <= 0) return null;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}