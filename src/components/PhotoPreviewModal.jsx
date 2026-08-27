import React, { useEffect, useState } from 'react';
import AppIcon from './AppIcon.jsx';

export default function PhotoPreviewModal({ photo, onClose, onDelete }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!photo?.blob) return undefined;

    const nextUrl = URL.createObjectURL(photo.blob);
    setUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [photo?.blob]);

  if (!photo) return null;

  return (
    <div className="photo-preview-modal" role="dialog" aria-modal="true" aria-label="사진 크게보기">
      <div className="photo-preview-backdrop" onClick={onClose} />
      <div className="photo-preview-panel">
        <div className="photo-preview-toolbar">
          <button type="button" onClick={onClose} aria-label="사진 닫기">
            <AppIcon name="x" />
          </button>
          <button type="button" onClick={() => onDelete(photo)} aria-label="사진 삭제">
            <AppIcon name="trash" />
            삭제
          </button>
        </div>
        {url && <img src={url} alt="현장사진 크게보기" />}
      </div>
    </div>
  );
}
