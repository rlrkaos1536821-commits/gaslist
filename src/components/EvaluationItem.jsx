import React from 'react';

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
  const isAnswered = answer !== undefined && answer !== '';
  const cardTone = isAnswered ? getScoreTone(item, score) : 'neutral';

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
        <label className={`number-input tone-${cardTone}`}>
          <span>{item.placeholder}</span>
          <div>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={answer ?? ''}
              onChange={(event) => onChange(item, event.target.value)}
              placeholder="0"
            />
            <em>{item.unit}</em>
          </div>
        </label>
      )}

      <div className="item-score">
        <span>{isAnswered ? '계산점수' : '미평가'}</span>
        <strong>{isAnswered ? `${score}점` : '-'}</strong>
      </div>
    </article>
  );
}
