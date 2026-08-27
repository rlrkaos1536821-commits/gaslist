import {
  EVALUATION_DB_NAME,
  EVALUATION_DB_VERSION,
  EVALUATION_STORE_NAME,
  PHOTO_STORE_NAME,
} from './evaluationStorage.js';

export const MAX_PHOTOS_PER_ITEM = 3;

let photoDbPromise;

function openPhotoDb() {
  if (photoDbPromise) return photoDbPromise;

  photoDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(EVALUATION_DB_NAME, EVALUATION_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EVALUATION_STORE_NAME)) {
        const evaluationStore = db.createObjectStore(EVALUATION_STORE_NAME, { keyPath: 'id' });
        evaluationStore.createIndex('updatedAt', 'updatedAt');
      }

      if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        const photoStore = db.createObjectStore(PHOTO_STORE_NAME, { keyPath: 'id' });
        photoStore.createIndex('taskId', 'taskId');
        photoStore.createIndex('taskItem', ['taskId', 'evaluationItemId']);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB photo upgrade was blocked.'));
  });

  return photoDbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runPhotoStoreOperation(mode, operation) {
  return openPhotoDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE_NAME, mode);
    const store = transaction.objectStore(PHOTO_STORE_NAME);
    const result = operation(store);

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }));
}

function createPhotoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `photo_${crypto.randomUUID()}`;
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sortPhotos(photos) {
  return [...photos].sort((first, second) => {
    const orderDiff = (Number(first.order) || 0) - (Number(second.order) || 0);
    if (orderDiff !== 0) return orderDiff;
    return String(first.createdAt).localeCompare(String(second.createdAt));
  });
}

export function normalizePhotoRecord(photo) {
  if (!photo || typeof photo !== 'object' || !photo.id) return null;

  return {
    id: String(photo.id),
    taskId: String(photo.taskId || ''),
    evaluationItemId: String(photo.evaluationItemId || ''),
    category: String(photo.category || ''),
    order: Number(photo.order) || 0,
    blob: photo.blob,
    mimeType: String(photo.mimeType || photo.blob?.type || 'image/jpeg'),
    width: Number(photo.width) || 0,
    height: Number(photo.height) || 0,
    size: Number(photo.size ?? photo.blob?.size) || 0,
    originalSize: Number(photo.originalSize) || 0,
    createdAt: String(photo.createdAt || ''),
    updatedAt: String(photo.updatedAt || photo.createdAt || ''),
  };
}

export async function savePhoto(photo) {
  const now = new Date().toISOString();
  const normalized = normalizePhotoRecord({
    ...photo,
    id: photo.id || createPhotoId(),
    mimeType: photo.mimeType || photo.blob?.type || 'image/jpeg',
    size: photo.size ?? photo.blob?.size ?? 0,
    createdAt: photo.createdAt || now,
    updatedAt: now,
  });

  if (!normalized?.taskId || !normalized.evaluationItemId || !normalized.blob) {
    throw new Error('Invalid photo record.');
  }

  await runPhotoStoreOperation('readwrite', (store) => {
    store.put(normalized);
  });

  return normalized;
}

export async function getPhotosByTask(taskId) {
  if (!taskId) return [];

  const photos = await runPhotoStoreOperation('readonly', (store) => (
    requestToPromise(store.index('taskId').getAll(taskId))
  ));

  return sortPhotos(photos.map(normalizePhotoRecord).filter(Boolean));
}

export async function getPhotosByEvaluationItem(taskId, evaluationItemId) {
  if (!taskId || !evaluationItemId) return [];

  const photos = await runPhotoStoreOperation('readonly', (store) => (
    requestToPromise(store.index('taskItem').getAll([taskId, evaluationItemId]))
  ));

  return sortPhotos(photos.map(normalizePhotoRecord).filter(Boolean));
}

export async function deletePhoto(photoId) {
  if (!photoId) return;

  await runPhotoStoreOperation('readwrite', (store) => {
    store.delete(photoId);
  });
}

export async function deletePhotosByTask(taskId) {
  if (!taskId) return;

  const photos = await getPhotosByTask(taskId);
  await runPhotoStoreOperation('readwrite', (store) => {
    photos.forEach((photo) => store.delete(photo.id));
  });
}

export async function updatePhotoOrder(taskId, evaluationItemId) {
  const photos = await getPhotosByEvaluationItem(taskId, evaluationItemId);

  await runPhotoStoreOperation('readwrite', (store) => {
    photos.forEach((photo, index) => {
      store.put({
        ...photo,
        order: index,
        updatedAt: new Date().toISOString(),
      });
    });
  });

  return getPhotosByEvaluationItem(taskId, evaluationItemId);
}
