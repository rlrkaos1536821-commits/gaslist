export const DRAFT_STORAGE_KEY = 'constructionEvaluationDraft';

export function saveDraft({ currentEvaluationId = '', projectInfo, evaluationResults, evaluationNotes = {} }) {
  const lastSavedAt = new Date().toISOString();
  const draft = {
    currentEvaluationId,
    projectInfo,
    evaluationResults,
    evaluationNotes,
    lastSavedAt,
  };

  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  return draft;
}

export function loadDraft() {
  try {
    const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!rawDraft) return null;

    const draft = JSON.parse(rawDraft);
    return {
      currentEvaluationId: draft.currentEvaluationId || '',
      projectInfo: draft.projectInfo && typeof draft.projectInfo === 'object' ? draft.projectInfo : {},
      evaluationResults:
        draft.evaluationResults && typeof draft.evaluationResults === 'object'
          ? draft.evaluationResults
          : {},
      evaluationNotes:
        draft.evaluationNotes && typeof draft.evaluationNotes === 'object'
          ? draft.evaluationNotes
          : {},
      lastSavedAt: draft.lastSavedAt || '',
    };
  } catch (error) {
    console.error('Failed to load evaluation draft.', error);
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear evaluation draft.', error);
  }
}

export function formatSavedAt(savedAt) {
  if (!savedAt) return '';

  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
