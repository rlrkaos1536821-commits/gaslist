export const EVALUATION_DB_NAME = 'constructionEvaluationHistory';
export const EVALUATION_DB_VERSION = 1;
export const EVALUATION_STORE_NAME = 'evaluations';

export const TASK_STATUSES = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  DRAFT: 'draft',
  COMPLETED: 'completed',
  EDITING: 'editing',
};

let dbPromise;

function openEvaluationDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(EVALUATION_DB_NAME, EVALUATION_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EVALUATION_STORE_NAME)) {
        const store = db.createObjectStore(EVALUATION_STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB upgrade was blocked.'));
  });

  return dbPromise;
}

function runStoreOperation(mode, operation) {
  return openEvaluationDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(EVALUATION_STORE_NAME, mode);
    const store = transaction.objectStore(EVALUATION_STORE_NAME);
    const result = operation(store);

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }));
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function normalizeText(value) {
  return String(value ?? '');
}

function normalizeStatus(value) {
  return Object.values(TASK_STATUSES).includes(value) ? value : TASK_STATUSES.COMPLETED;
}

export function normalizeEvaluationRecord(record) {
  if (!record || typeof record !== 'object' || !record.id) return null;

  const projectInfo = record.projectInfo && typeof record.projectInfo === 'object'
    ? record.projectInfo
    : {};
  const evaluationResults = record.evaluationResults && typeof record.evaluationResults === 'object'
    ? record.evaluationResults
    : {};
  const evaluationNotes = record.evaluationNotes && typeof record.evaluationNotes === 'object'
    ? record.evaluationNotes
    : {};

  return {
    id: normalizeText(record.id),
    status: normalizeStatus(record.status),
    createdAt: normalizeText(record.createdAt),
    updatedAt: normalizeText(record.updatedAt || record.createdAt),
    completedAt: normalizeText(record.completedAt),
    lastExcelGeneratedAt: normalizeText(record.lastExcelGeneratedAt),
    projectInfo,
    evaluationResults,
    evaluationNotes,
    basicScore: Number(record.basicScore) || 0,
    adjustmentScore: Number(record.adjustmentScore) || 0,
    totalScore: Number(record.totalScore) || 0,
    completedCount: Number(record.completedCount) || 0,
    totalCount: Number(record.totalCount) || 30,
  };
}

export async function getAllEvaluations() {
  const records = await runStoreOperation('readonly', (store) => requestToPromise(store.getAll()));

  return records
    .map(normalizeEvaluationRecord)
    .filter(Boolean)
    .sort((first, second) => String(second.updatedAt).localeCompare(String(first.updatedAt)));
}

export async function getEvaluation(id) {
  const record = await runStoreOperation('readonly', (store) => requestToPromise(store.get(id)));
  return normalizeEvaluationRecord(record);
}

export async function saveEvaluation(evaluation) {
  const normalized = normalizeEvaluationRecord(evaluation);
  if (!normalized) {
    throw new Error('Invalid evaluation record.');
  }

  await runStoreOperation('readwrite', (store) => {
    store.put(normalized);
  });

  return normalized;
}

export async function deleteEvaluation(id) {
  await runStoreOperation('readwrite', (store) => {
    store.delete(id);
  });
}
