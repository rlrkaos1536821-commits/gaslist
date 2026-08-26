import React, { useEffect, useState } from 'react';

const fields = [
  { name: 'projectName', label: '공사명', type: 'text' },
  { name: 'projectNumber', label: '공사번호', type: 'text' },
  { name: 'startDate', label: '공사 시작일', type: 'date' },
  { name: 'endDate', label: '공사 종료일', type: 'date' },
  { name: 'scale', label: '공사규모', type: 'text' },
];

const contractorOptions = [
  '한마음엔지니어링',
  '일진엔지니어링',
  '서경건설',
  '동부가스이엔지',
  '푸른가스건설',
  '대한가스산업',
  '현창엔지니어링',
  '나노',
];

export default function ProjectInfoForm({ value, onChange }) {
  const [contractorMode, setContractorMode] = useState('preset');
  const [isContractorPickerOpen, setIsContractorPickerOpen] = useState(false);

  const updateField = (name, nextValue) => {
    onChange((current) => ({ ...current, [name]: nextValue }));
  };

  const selectedContractor = value.contractor ?? '';
  const isCustomContractor = selectedContractor && !contractorOptions.includes(selectedContractor);
  const isDirectInput = contractorMode === 'custom' || Boolean(isCustomContractor);
  const contractorLabel = selectedContractor || '시공협력사를 선택하세요';

  const selectCustomContractor = () => {
    setContractorMode('custom');
    updateField('contractor', '');
    setIsContractorPickerOpen(false);
  };

  useEffect(() => {
    if (isCustomContractor) {
      setContractorMode('custom');
      return;
    }

    if (selectedContractor) {
      setContractorMode('preset');
    }
  }, [isCustomContractor, selectedContractor]);

  return (
    <section className={`panel project-panel ${isContractorPickerOpen ? 'is-picker-open' : ''}`}>
      <div className="section-heading">
        <div>
          <h2>공사정보</h2>
          <p>공사에 대한 기본 정보를 입력해주세요.</p>
        </div>
      </div>
      <div className="project-grid">
        {fields.map((field) => (
          <label className="field" key={field.name}>
            <span>{field.label}</span>
            <input
              type={field.type}
              value={value[field.name] ?? ''}
              onChange={(event) => updateField(field.name, event.target.value)}
              placeholder={field.label}
            />
          </label>
        ))}
        <div className="field contractor-field">
          <span>시공협력사</span>
          {isDirectInput ? (
            <div className="contractor-direct">
              <input
                type="text"
                value={selectedContractor}
                onChange={(event) => updateField('contractor', event.target.value)}
                placeholder="시공협력사를 직접 입력하세요"
              />
              <button
                type="button"
                className="contractor-change-button"
                onClick={() => setIsContractorPickerOpen(true)}
              >
                선택
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`contractor-select ${selectedContractor ? '' : 'is-placeholder'}`}
              onClick={() => setIsContractorPickerOpen(true)}
            >
              {contractorLabel}
              <span aria-hidden="true">⌄</span>
            </button>
          )}
        </div>
        <label className="field">
          <span>시공관리자</span>
          <input
            type="text"
            value={value.manager ?? ''}
            onChange={(event) => updateField('manager', event.target.value)}
            placeholder="시공관리자"
          />
        </label>
      </div>
      {isContractorPickerOpen && (
        <div
          className="contractor-picker-backdrop"
          role="presentation"
          onClick={() => setIsContractorPickerOpen(false)}
        >
          <div
            className="contractor-picker"
            role="dialog"
            aria-modal="true"
            aria-label="시공협력사 선택"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="contractor-picker-header">
              <div>
                <strong>시공협력사 선택</strong>
                <span>정해진 업체를 빠르게 선택하세요.</span>
              </div>
              <button
                type="button"
                aria-label="시공협력사 선택 닫기"
                onClick={() => setIsContractorPickerOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="contractor-picker-options">
              {contractorOptions.map((contractor) => (
              <button
                type="button"
                className={`contractor-picker-option ${selectedContractor === contractor ? 'selected' : ''}`}
                key={contractor}
                data-contractor-option={contractor}
                onClick={() => {
                    setContractorMode('preset');
                    updateField('contractor', contractor);
                    setIsContractorPickerOpen(false);
                  }}
                >
                  {contractor}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`contractor-custom-button ${isDirectInput ? 'selected' : ''}`}
              data-contractor-option="custom"
              onPointerDown={selectCustomContractor}
              onClick={selectCustomContractor}
            >
              직접입력
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
