import React, { useEffect, useMemo, useRef, useState } from 'react';
import AppIcon from './AppIcon.jsx';

function getScoreTone(item, value) {
  if (value === undefined || value === '') return 'neutral';

  if (item.scoreType === 'adjustment') {
    if (value > 0) return 'high';
    if (value < 0) return 'low';
    return 'middle';
  }

  if (value <= 0) return 'low';
  if (item.maxScore > 0 && value / item.maxScore >= 0.7) return 'high';
  return 'middle';
}

export default function EvaluationItem({ item, answer, score, onChange }) {
  const [isNumberPickerOpen, setIsNumberPickerOpen] = useState(false);
  const selectedNumberRef = useRef(null);
  const numberOptions = useMemo(() => Array.from({ length: 101 }, (_, index) => index), []);
  const isAnswered = answer !== undefined && answer !== '';
  const cardTone = isAnswered ? getScoreTone(item, score) : 'neutral';
  const selectedNumber = isAnswered ? Number(answer) : null;

  useEffect(() => {
    if (!isNumberPickerOpen) return;

    window.setTimeout(() => {
      selectedNumberRef.current?.scrollIntoView({ block: 'center' });
    }, 0);
  }, [isNumberPickerOpen]);

  const selectNumber = (value) => {
    onChange(item, String(value));
    setIsNumberPickerOpen(false);
  };

  return (
    <article
      id={`item-${item.id}`}
      className={`evaluation-card ${isAnswered ? 'is-answered' : 'is-unanswered'} tone-${cardTone}`}
    >
      <div className="item-header">
        <div>
          <span className="cell">{item.excelCell}</span>
          <h3>{item.title}</h3>
        </div>
        <span className="max-score">
          {item.scoreType === 'adjustment' ? '가감점' : `${item.maxScore}점`}
        </span>
      </div>

      {(item.guide || item.inspectionTarget) && (
        <div className="guide">
          {item.inspectionTarget && <p>점검대상: {item.inspectionTarget}</p>}
          {item.guide && item.guide !== item.inspectionTarget && <p>{item.guide}</p>}
        </div>
      )}

      {item.inputType === 'choice' ? (
        <div className="option-list">
          {item.options.map((option) => {
            const selected = answer === option.label;
            const optionTone = getScoreTone(item, option.score);
            return (
              <label className={`option tone-${optionTone} ${selected ? 'selected' : ''}`} key={option.label}>
                <input
                  type="radio"
                  name={item.id}
                  checked={selected}
                  onChange={() => onChange(item, option.label)}
                />
                <span>{option.label}</span>
                <strong>{option.score}점</strong>
              </label>
            );
          })}
        </div>
      ) : (
        <div className={`number-input tone-${cardTone}`}>
          <span>{item.placeholder}</span>
          <div>
            <button
              type="button"
              className={`number-picker-trigger ${isAnswered ? 'has-value' : ''}`}
              onClick={() => setIsNumberPickerOpen(true)}
              aria-label={`${item.placeholder} 선택`}
            >
              <strong>{isAnswered ? selectedNumber : '선택'}</strong>
              <AppIcon name="chevronDown" />
            </button>
            <em>{item.unit}</em>
          </div>
          {isNumberPickerOpen && (
            <div className="number-picker-backdrop" onClick={() => setIsNumberPickerOpen(false)}>
              <div
                className="number-picker"
                role="dialog"
                aria-modal="true"
                aria-label={`${item.placeholder} 선택`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="number-picker-header">
                  <div>
                    <span>{item.excelCell}</span>
                    <strong>{item.placeholder} 선택</strong>
                  </div>
                  <button type="button" onClick={() => setIsNumberPickerOpen(false)} aria-label="선택창 닫기">
                    <AppIcon name="x" />
                  </button>
                </div>
                <div className="number-picker-list">
                  {numberOptions.map((value) => {
                    const selected = selectedNumber === value;
                    return (
                      <button
                        key={value}
                        ref={selected ? selectedNumberRef : null}
                        type="button"
                        className={selected ? 'selected' : ''}
                        onClick={() => selectNumber(value)}
                      >
                        <span>{value}</span>
                        <em>{item.unit}</em>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="item-score">
        <span>{isAnswered ? '계산점수' : '미평가'}</span>
        <strong>{isAnswered ? `${score}점` : '-'}</strong>
      </div>
    </article>
  );
}
