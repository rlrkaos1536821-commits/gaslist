import React, { useRef, useState } from 'react';
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
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const photoCount = photos.length;
  const canAddMore = photoCount < MAX_PHOTOS_PER_ITEM && !isProcessing;

  const processSelectedPhotos = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setIsActionSheetOpen(false);

    if (files.length > 0) {
      onAddPhotos(item, files);
    }
  };

  const openCamera = () => {
    if (!canAddMore) return;
    setIsActionSheetOpen(false);
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    if (!canAddMore) return;
    setIsActionSheetOpen(false);
    galleryInputRef.current?.click();
  };

  return (
    <section className="item-photos" aria-label={`${item.title} 현장사진`}>
      <div className="item-photos-header">
        <span>
          <AppIcon name="image" />
          현장사진 {photoCount}/{MAX_PHOTOS_PER_ITEM}
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
          <button
            type="button"
            className="photo-add-button"
            onClick={() => setIsActionSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isActionSheetOpen}
          >
            <AppIcon name="plus" />
            <span>{photoCount > 0 ? '추가' : '사진 첨부'}</span>
          </button>
        )}
      </div>

      {!canAddMore && photoCount >= MAX_PHOTOS_PER_ITEM && (
        <p className="photo-limit-message">이 항목에 사진 {MAX_PHOTOS_PER_ITEM}장을 모두 첨부했습니다.</p>
      )}

      {isActionSheetOpen && (
        <div className="photo-action-sheet" role="dialog" aria-modal="true" aria-label="사진 추가 방식 선택">
          <button
            type="button"
            className="photo-action-backdrop"
            aria-label="사진 추가 메뉴 닫기"
            onClick={() => setIsActionSheetOpen(false)}
          />
          <div className="photo-action-panel">
            <strong>사진 추가</strong>
            <button type="button" onClick={openCamera}>
              <AppIcon name="camera" />
              <span>카메라로 촬영</span>
            </button>
            <button type="button" onClick={openGallery}>
              <AppIcon name="image" />
              <span>앨범에서 선택</span>
            </button>
            <button type="button" className="photo-action-cancel" onClick={() => setIsActionSheetOpen(false)}>
              취소
            </button>
          </div>
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={processSelectedPhotos}
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={processSelectedPhotos}
      />
    </section>
  );
}
