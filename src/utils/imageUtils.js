export const MAX_IMAGE_DIMENSION = 1280;
export const JPEG_QUALITY = 0.75;
export const PHOTO_SIZE_WARNING_BYTES = 15 * 1024 * 1024;

function calculateResizeSize(width, height, maxDimension) {
  if (width <= 0 || height <= 0) {
    throw new Error('Invalid image dimensions.');
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Image compression failed.'));
        return;
      }

      resolve(blob);
    }, 'image/jpeg', quality);
  });
}

export async function compressImage(file) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('이미지 파일만 첨부할 수 있습니다.');
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const target = calculateResizeSize(bitmap.width, bitmap.height, MAX_IMAGE_DIMENSION);
  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;

  const context = canvas.getContext('2d', {
    alpha: false,
  });

  if (!context) {
    bitmap.close?.();
    throw new Error('이미지 처리 환경을 사용할 수 없습니다.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, target.width, target.height);
  context.drawImage(bitmap, 0, 0, target.width, target.height);
  bitmap.close?.();

  const blob = await canvasToJpegBlob(canvas, JPEG_QUALITY);

  if (import.meta.env.DEV) {
    console.log('Photo compression result', {
      originalSize: file.size,
      compressedSize: blob.size,
      width: target.width,
      height: target.height,
      mimeType: blob.type,
    });
  }

  return {
    blob,
    width: target.width,
    height: target.height,
    originalSize: file.size,
    compressedSize: blob.size,
  };
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
