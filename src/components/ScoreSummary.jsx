import React from 'react';
import AppIcon from './AppIcon.jsx';

const formatAdjustment = (score) => {
  if (score > 0) return `+${score}`;
  return String(score);
};

export default function ScoreSummary({ basicScore, adjustmentScore, totalScore, unevaluatedCount, lastSavedAt }) {
  const totalItems = 30;
  const completedCount = totalItems - unevaluatedCount;
  const progressPercent = Math.round((completedCount / totalItems) * 100);
  const progressStyle = {
    width: `${progressPercent}%`,
  };
  const ringStyle = {
    background: `conic-gradient(#ffffff ${progressPercent}%, rgba(255, 255, 255, 0.24) 0)`,
  };

  return (
    <section className="score-summary" aria-label="평가 상태">
      <div className="score-hero">
        <div className="score-main">
          <span>총 평가점수</span>
          <strong>{totalScore}점 <em>/ 100점</em></strong>
        </div>
        <div className="score-ring" style={ringStyle} aria-hidden="true">
          <span>{progressPercent}%</span>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span style={progressStyle} />
        </div>
        <p>{completedCount}/{totalItems} 항목 완료 · 미평가 {unevaluatedCount}</p>
        <div className="score-details">
          <div className="score-detail-base">
            <i><AppIcon name="userCheck" /></i>
            <span>기본점수</span>
            <strong>{basicScore} / 100</strong>
          </div>
          <div className="score-detail-adjust">
            <i><AppIcon name="scale" /></i>
            <span>가감점</span>
            <strong>{formatAdjustment(adjustmentScore)}</strong>
          </div>
          <div className="score-detail-missing">
            <i><AppIcon name="alert" /></i>
            <span>미평가</span>
            <strong>{unevaluatedCount}개</strong>
          </div>
        </div>
      </div>
      {lastSavedAt && <p className="last-saved">임시저장됨 · {lastSavedAt}</p>}
    </section>
  );
}
