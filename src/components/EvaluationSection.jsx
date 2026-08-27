import React from 'react';
import AppIcon from './AppIcon.jsx';
import EvaluationItem from './EvaluationItem.jsx';

const formatSectionScore = (score, isAdjustment) => {
  if (isAdjustment && score > 0) return `+${score}점`;
  return `${score}점`;
};

const sectionMeta = {
  시공관리: {
    icon: 'clipboard',
    description: '시공 품질 및 관리 상태 평가',
  },
  안전관리: {
    icon: 'shield',
    description: '안전 수칙 준수 및 사고 예방 평가',
  },
  일반관리: {
    icon: 'list',
    description: '일반 관리 및 현장 환경 평가',
  },
  가감점: {
    icon: 'scale',
    description: '가감점 항목 평가',
  },
};

export default function EvaluationSection({
  title,
  items,
  answers,
  notes,
  getScore,
  photosByItem = {},
  photoProcessing = {},
  onAnswerChange,
  onNoteChange,
  onAddPhotos,
  onPreviewPhoto,
  onDeletePhoto,
  isOpen,
  onToggle,
}) {
  const answeredCount = items.filter((item) => answers[item.id] !== undefined && answers[item.id] !== '').length;
  const sectionScore = items.reduce((sum, item) => sum + getScore(item), 0);
  const maxScore = items.reduce((sum, item) => sum + (item.scoreType === 'adjustment' ? 0 : item.maxScore), 0);
  const sectionId = `section-${title}`;
  const isComplete = answeredCount === items.length;
  const isAdjustment = title === '가감점';
  const meta = sectionMeta[title] ?? { icon: 'list', description: '평가 항목' };

  return (
    <section className={`evaluation-section section-${title} ${isComplete ? 'is-complete' : ''}`}>
      <button
        type="button"
        className="section-toggle"
        aria-expanded={isOpen}
        aria-controls={sectionId}
        onClick={onToggle}
      >
        <span className="section-icon"><AppIcon name={meta.icon} /></span>
        <div className="section-copy">
          <div className="section-title-row">
            <h2>{isComplete ? `${title} 완료` : title}</h2>
            <span className="section-chevron">
              <AppIcon name={isOpen ? 'chevronDown' : 'chevronRight'} />
            </span>
          </div>
          <p>{meta.description}</p>
          <span>{answeredCount} / {items.length} 완료</span>
        </div>
        <div className="section-meta">
          <strong>{isAdjustment ? formatSectionScore(sectionScore, true) : `${sectionScore} / ${maxScore}점`}</strong>
        </div>
      </button>
      {isOpen && (
        <div className="item-stack" id={sectionId}>
          {items.map((item) => (
            <EvaluationItem
              key={item.id}
              item={item}
              answer={answers[item.id]}
              note={notes[item.id] ?? ''}
              score={getScore(item)}
              photos={photosByItem[item.id] ?? []}
              isPhotoProcessing={Boolean(photoProcessing[item.id])}
              photoProcessingText={photoProcessing[item.id] ?? ''}
              onChange={onAnswerChange}
              onNoteChange={onNoteChange}
              onAddPhotos={onAddPhotos}
              onPreviewPhoto={onPreviewPhoto}
              onDeletePhoto={onDeletePhoto}
            />
          ))}
        </div>
      )}
    </section>
  );
}
