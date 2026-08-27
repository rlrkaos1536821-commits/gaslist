import React, { useRef } from 'react';
import { MAX_PHOTOS_PER_ITEM } from '../services/photoStorage.js';
import AppIcon from './AppIcon.jsx';
import PhotoThumbnail from './PhotoThumbnail.jsx';

export default function EvaluationPhotoSection({
  item,
  photos,
  isProcessing,
  processingText,
  onAddPhotos,
  onPreviewPhoto,
  onDeletePhoto,
}) {
  const inputRef = useRef(null);
  const photoCount = photos.length;
  const canAddMore = photoCount < MAX_PHOTOS_PER_ITEM && !isProcessing;

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length > 0) {
      onAddPhotos(item, files);
    }
  };

  return (
    <section className="item-photos" aria-label={`${item.title} 현장사진`}>
      <div className="item-photos-header">
        <span>
          <AppIcon name="image" />
          현장사진 {photoCount}장
        </span>
        {isProcessing && <em>{processingText || '사진 처리 중...'}</em>}
      </div>

      <div className="photo-strip">
        {photos.map((photo, index) => (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            index={index}
            onPreview={onPreviewPhoto}
            onDelete={onDeletePhoto}
          />
        ))}

        {canAddMore && (
          <button type="button" className="photo-add-button" onClick={() => inputRef.current?.click()}>
            <AppIcon name="plus" />
            <span>{photoCount > 0 ? '추가' : '사진 첨부'}</span>
          </button>
        )}
      </div>

      {!canAddMore && photoCount >= MAX_PHOTOS_PER_ITEM && (
        <p className="photo-limit-message">사진은 평가항목당 최대 {MAX_PHOTOS_PER_ITEM}장까지 첨부할 수 있습니다.</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />
    </section>
  );
}
