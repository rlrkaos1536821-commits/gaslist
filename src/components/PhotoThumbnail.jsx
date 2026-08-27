import React, { useEffect, useState } from 'react';
import AppIcon from './AppIcon.jsx';

export default function PhotoThumbnail({ photo, index, onPreview, onDelete }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!photo?.blob) return undefined;

    const nextUrl = URL.createObjectURL(photo.blob);
    setUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [photo?.blob]);

  return (
    <div className="photo-thumbnail">
      <button
        type="button"
        className="photo-preview-button"
        onClick={() => onPreview(photo)}
        aria-label={`사진 ${index + 1} 크게보기`}
      >
        {url ? <img src={url} alt={`현장사진 ${index + 1}`} /> : <AppIcon name="image" />}
      </button>
      <button
        type="button"
        className="photo-delete-button"
        onClick={() => onDelete(photo)}
        aria-label={`사진 ${index + 1} 삭제`}
      >
        <AppIcon name="x" />
      </button>
    </div>
  );
}
