import React, { useEffect, useMemo, useRef, useState } from 'react';
import AppIcon from './components/AppIcon.jsx';
import EvaluationSection from './components/EvaluationSection.jsx';
import ProjectInfoForm from './components/ProjectInfoForm.jsx';
import ScoreSummary from './components/ScoreSummary.jsx';
import { basicItems, evaluationItems } from './data/evaluationItems.js';
import {
  createEvaluationExcelBlob,
  createEvaluationExcelBlobFromEvaluation,
  downloadExcelBlob,
} from './services/excelService.js';
import {
  deleteEvaluation,
  EVALUATION_DB_NAME,
  getAllEvaluations,
  saveEvaluation,
} from './services/evaluationStorage.js';
import { clearDraft, formatSavedAt, loadDraft, saveDraft } from './utils/draftStorage.js';
import { formatDateForDisplay } from './utils/dateUtils.js';
import { getItemScore, getUnevaluatedItems, isAnswered } from './utils/scoring.js';
import { createEvaluationMailtoHref, createShareFile, tryShareExcel } from './utils/shareUtils.js';

const initialProjectInfo = {
  projectName: '',
  projectNumber: '',
  startDate: '',
  endDate: '',
  scale: '',
  contractor: '',
  manager: '',
};

const categoryOrder = ['시공관리', '안전관리', '일반관리', '가감점'];

const initialOpenSections = {
  시공관리: true,
  안전관리: false,
  일반관리: false,
  가감점: false,
};

const requiredProjectFields = [
  ['projectNumber', '공사번호'],
  ['projectName', '공사명'],
  ['contractor', '시공협력사'],
  ['manager', '시공관리자'],
];

const THEME_STORAGE_KEY = 'constructionEvaluationTheme';

function groupItemsByCategory(items) {
  return categoryOrder.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  }));
}

function createEvaluationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `evaluation_${crypto.randomUUID()}`;
  return `evaluation_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function calculateScores(evaluationResults) {
  const basicScore = basicItems.reduce((sum, item) => sum + getItemScore(item, evaluationResults[item.id]), 0);
  const adjustmentScore = evaluationItems
    .filter((item) => item.scoreType === 'adjustment')
    .reduce((sum, item) => sum + getItemScore(item, evaluationResults[item.id]), 0);
  const unevaluatedCount = evaluationItems.filter((item) => !isAnswered(evaluationResults[item.id])).length;

  return {
    basicScore,
    adjustmentScore,
    totalScore: basicScore + adjustmentScore,
    unevaluatedCount,
  };
}

function buildSearchText(evaluation) {
  const info = evaluation.projectInfo ?? {};
  return [info.projectName, info.projectNumber, info.contractor].join(' ').toLowerCase();
}

function EvaluationList({
  evaluations,
  isLoading,
  searchTerm,
  onSearchChange,
  onOpenEvaluation,
  onNewEvaluation,
}) {
  const filteredEvaluations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return evaluations;

    return evaluations.filter((evaluation) => buildSearchText(evaluation).includes(normalizedSearch));
  }, [evaluations, searchTerm]);

  return (
    <section className="history-view" aria-label="평가 리스트">
      <div className="history-heading">
        <div>
          <span>{EVALUATION_DB_NAME}</span>
          <h2>평가 리스트</h2>
        </div>
        <strong>{evaluations.length}건</strong>
      </div>

      <label className="history-search">
        <AppIcon name="search" />
        <input
          type="search"
          value={searchTerm}
          placeholder="공사명 또는 공사번호 검색"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      {isLoading ? (
        <p className="history-message">저장된 평가를 불러오는 중입니다.</p>
      ) : filteredEvaluations.length === 0 ? (
        <div className="empty-history">
          <strong>저장된 평가가 없습니다.</strong>
          <p>새 평가를 작성하고 저장하면 이곳에서 다시 확인할 수 있습니다.</p>
          <button type="button" className="secondary-button compact-action" onClick={onNewEvaluation}>
            <span className="button-icon"><AppIcon name="play" /></span>
            <span>
              <strong>새 평가 작성</strong>
              <small>평가 작성 화면으로 이동</small>
            </span>
          </button>
        </div>
      ) : (
        <div className="history-list">
          {filteredEvaluations.map((evaluation) => {
            const info = evaluation.projectInfo ?? {};
            return (
              <button
                type="button"
                className="history-card"
                key={evaluation.id}
                onClick={() => onOpenEvaluation(evaluation)}
              >
                <div className="history-card-main">
                  <strong>{info.projectName || '공사명 없음'}</strong>
                  <span>{info.projectNumber || '공사번호 없음'}</span>
                  <em>{[info.contractor || '시공협력사 없음', info.manager || '시공관리자 없음'].join(' · ')}</em>
                  <small>{formatDateForDisplay(evaluation.updatedAt, { includeTime: true })}</small>
                </div>
                <div className="history-score">
                  <strong>{evaluation.totalScore}</strong>
                  <span>점</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EvaluationDetail({
  evaluation,
  groupedItems,
  detailNotice,
  detailAction,
  onBack,
  onShare,
  onDelete,
}) {
  if (!evaluation) {
    return (
      <section className="history-view">
        <p className="history-message">선택한 평가를 찾을 수 없습니다.</p>
        <button type="button" className="ghost-button compact-action" onClick={onBack}>
          <span className="button-icon"><AppIcon name="arrowLeft" /></span>
          <span>
            <strong>목록으로 돌아가기</strong>
            <small>평가 리스트로 이동</small>
          </span>
        </button>
      </section>
    );
  }

  const info = evaluation.projectInfo ?? {};
  const getStoredScore = (item) => getItemScore(item, evaluation.evaluationResults[item.id]);

  return (
    <section className="detail-view" aria-label="평가 상세">
      <button type="button" className="back-button" onClick={onBack}>
        <AppIcon name="arrowLeft" />
        평가 리스트
      </button>

      <div className="detail-hero">
        <div>
          <span>{formatDateForDisplay(evaluation.updatedAt, { includeTime: true })}</span>
          <h2>{info.projectName || '공사명 없음'}</h2>
          <p>{info.projectNumber || '공사번호 없음'}</p>
        </div>
        <strong>{evaluation.totalScore}점</strong>
      </div>

      <dl className="detail-info">
        <div>
          <dt>시공협력사</dt>
          <dd>{info.contractor || '-'}</dd>
        </div>
        <div>
          <dt>시공관리자</dt>
          <dd>{info.manager || '-'}</dd>
        </div>
        <div>
          <dt>공사기간</dt>
          <dd>{[info.startDate, info.endDate].filter(Boolean).join(' ~ ') || '-'}</dd>
        </div>
        <div>
          <dt>공사규모</dt>
          <dd>{info.scale || '-'}</dd>
        </div>
      </dl>

      <div className="detail-score-grid">
        <div>
          <span>기본점수</span>
          <strong>{evaluation.basicScore}점</strong>
        </div>
        <div>
          <span>가·감점</span>
          <strong>{evaluation.adjustmentScore > 0 ? `+${evaluation.adjustmentScore}` : evaluation.adjustmentScore}점</strong>
        </div>
      </div>

      <div className="detail-sections">
        {groupedItems.map(({ category, items }) => {
          const sectionScore = items.reduce((sum, item) => sum + getStoredScore(item), 0);
          return (
            <section className="detail-section" key={category}>
              <div className="detail-section-heading">
                <h3>{category}</h3>
                <strong>{sectionScore}점</strong>
              </div>
              <div className="detail-item-list">
                {items.map((item) => (
                  <div className="detail-item" key={item.id}>
                    <span>{item.excelCell}</span>
                    <p>{item.title}</p>
                    <em>{String(evaluation.evaluationResults[item.id] ?? '-')}</em>
                    {evaluation.evaluationNotes?.[item.id] && (
                      <small>{evaluation.evaluationNotes[item.id]}</small>
                    )}
                    <strong>{getStoredScore(item)}점</strong>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="actions">
        {detailNotice && <p className="notice">{detailNotice}</p>}
        <button type="button" className="secondary-button" onClick={onShare} disabled={Boolean(detailAction)}>
          <span className="button-icon"><AppIcon name="share" /></span>
          <span>
            <strong>{detailAction === 'share' ? 'Excel 생성 중...' : 'Excel 생성 및 공유'}</strong>
            <small>저장된 평가 데이터로 재생성</small>
          </span>
        </button>
        <button type="button" className="danger-button" onClick={onDelete}>
          <span className="button-icon"><AppIcon name="trash" /></span>
          <span>
            <strong>평가 삭제</strong>
            <small>저장된 평가 결과를 삭제</small>
          </span>
        </button>
      </div>
    </section>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch (error) {
      console.error('Failed to load theme.', error);
      return 'light';
    }
  });
  const [restoredDraft] = useState(() => loadDraft());
  const [activeView, setActiveView] = useState('edit');
  const [projectInfo, setProjectInfo] = useState({
    ...initialProjectInfo,
    ...(restoredDraft?.projectInfo ?? {}),
  });
  const [answers, setAnswers] = useState(restoredDraft?.evaluationResults ?? {});
  const [notes, setNotes] = useState(restoredDraft?.evaluationNotes ?? {});
  const [currentEvaluationId, setCurrentEvaluationId] = useState(restoredDraft?.currentEvaluationId ?? '');
  const [notice, setNotice] = useState(restoredDraft ? '임시저장 데이터가 복원되었습니다.' : '');
  const [mailFallback, setMailFallback] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(restoredDraft?.lastSavedAt ?? '');
  const [excelAction, setExcelAction] = useState('');
  const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [historySearch, setHistorySearch] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [detailNotice, setDetailNotice] = useState('');
  const [detailAction, setDetailAction] = useState('');
  const [isProjectInfoOpen, setIsProjectInfoOpen] = useState(true);
  const [openSections, setOpenSections] = useState(initialOpenSections);
  const didMountRef = useRef(false);
  const skipNextAutoSaveRef = useRef(false);

  const groupedItems = useMemo(() => groupItemsByCategory(evaluationItems), []);
  const scores = useMemo(() => calculateScores(answers), [answers]);
  const getScore = (item) => getItemScore(item, answers[item.id]);
  const isDarkMode = theme === 'dark';

  const loadEvaluationHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const storedEvaluations = await getAllEvaluations();
      setEvaluations(storedEvaluations);
      return storedEvaluations;
    } catch (error) {
      console.error('Failed to load saved evaluations.', error);
      setNotice('저장된 평가를 불러오는 중 오류가 발생했습니다.');
      return [];
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Failed to save theme.', error);
    }
  }, [theme]);

  useEffect(() => {
    loadEvaluationHistory();
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return undefined;
    }

    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return undefined;
    }

    const saveTimer = window.setTimeout(() => {
      try {
        const draft = saveDraft({
          currentEvaluationId,
          projectInfo,
          evaluationResults: answers,
          evaluationNotes: notes,
        });
        setLastSavedAt(draft.lastSavedAt);
      } catch (error) {
        console.error('Failed to save evaluation draft.', error);
      }
    }, 500);

    return () => window.clearTimeout(saveTimer);
  }, [currentEvaluationId, projectInfo, answers, notes]);

  const handleAnswerChange = (item, value) => {
    setAnswers((current) => ({
      ...current,
      [item.id]: value,
    }));
    setNotice('');
    setMailFallback(null);
  };

  const handleNoteChange = (item, value) => {
    setNotes((current) => ({
      ...current,
      [item.id]: value,
    }));
    setNotice('');
  };

  const handleProjectInfoChange = (nextProjectInfo) => {
    setProjectInfo(nextProjectInfo);
    setNotice('');
    setMailFallback(null);
  };

  const toggleSection = (category) => {
    setOpenSections((current) => ({
      ...current,
      [category]: !current[category],
    }));
  };

  const openSection = (category) => {
    setOpenSections((current) => ({
      ...current,
      [category]: true,
    }));
  };

  const resetEditorState = () => {
    clearDraft();
    skipNextAutoSaveRef.current = true;
    setProjectInfo(initialProjectInfo);
    setAnswers({});
    setNotes({});
    setCurrentEvaluationId('');
    setLastSavedAt('');
    setMailFallback(null);
    setIsProjectInfoOpen(true);
    setOpenSections(initialOpenSections);
  };

  const startNewEvaluation = () => {
    const confirmed = window.confirm('현재 작성 중인 평가내용과 임시저장 데이터를 삭제하시겠습니까?');
    if (!confirmed) return;

    resetEditorState();
    setActiveView('edit');
    setNotice('새 평가가 시작되었습니다.');
  };

  const validateEvaluation = (purpose = 'Excel') => {
    const missingProjectFields = requiredProjectFields
      .filter(([field]) => !String(projectInfo[field] || '').trim())
      .map(([, label]) => label);

    if (missingProjectFields.length > 0) {
      setNotice(`필수 공사정보를 입력해주세요. (${missingProjectFields.join(', ')})`);
      setActiveView('edit');
      return false;
    }

    const unevaluatedItems = getUnevaluatedItems(evaluationItems, answers);

    if (unevaluatedItems.length > 0) {
      const firstItem = unevaluatedItems[0];
      openSection(firstItem.category);
      window.setTimeout(() => {
        document.getElementById(`item-${firstItem.id}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 0);
      setNotice(`미평가 항목이 ${unevaluatedItems.length}개 있습니다. 모든 평가를 완료한 후 ${purpose}해주세요. (${unevaluatedItems.map((item) => item.excelCell).join(', ')})`);
      setActiveView('edit');
      return false;
    }

    return true;
  };

  const createExcelForAction = async () => createEvaluationExcelBlob({
    projectInfo,
    answers,
    notes,
    totalScore: scores.totalScore,
  });

  const saveCurrentEvaluation = async () => {
    if (isSavingEvaluation) return;
    if (!validateEvaluation('저장')) return;

    setIsSavingEvaluation(true);
    setNotice('저장 중...');

    const now = new Date().toISOString();
    const existingEvaluation = currentEvaluationId
      ? evaluations.find((evaluation) => evaluation.id === currentEvaluationId)
      : null;
    const evaluation = {
      id: currentEvaluationId || createEvaluationId(),
      createdAt: existingEvaluation?.createdAt || now,
      updatedAt: now,
      projectInfo,
      evaluationResults: answers,
      evaluationNotes: notes,
      basicScore: scores.basicScore,
      adjustmentScore: scores.adjustmentScore,
      totalScore: scores.totalScore,
    };

    try {
      const savedEvaluation = await saveEvaluation(evaluation);
      setCurrentEvaluationId(savedEvaluation.id);
      setNotice('평가가 저장되었습니다.');
      const nextEvaluations = await loadEvaluationHistory();
      setSelectedEvaluation(nextEvaluations.find((item) => item.id === savedEvaluation.id) ?? savedEvaluation);
    } catch (error) {
      console.error('Failed to save evaluation.', error);
      setNotice('평가 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSavingEvaluation(false);
    }
  };

  const shareOrDownloadEvaluationExcel = async () => {
    if (!validateEvaluation('Excel을 생성')) return;

    setExcelAction('share');
    setNotice('평가표 생성 중...');
    setMailFallback(null);

    let excel;

    try {
      excel = await createExcelForAction();
      let excelFile;

      try {
        excelFile = createShareFile(excel.blob, excel.fileName);
      } catch (fileError) {
        console.error('Failed to create Excel File object.', fileError);
        downloadExcelBlob(excel.blob, excel.fileName);
        setMailFallback({
          fileName: excel.fileName,
          fileSize: excel.size,
          status: 'unsupported',
          reason: 'file-api-unavailable',
          mailtoHref: createEvaluationMailtoHref({
            projectInfo,
            totalScore: scores.totalScore,
          }),
        });
        setNotice('');
        return;
      }

      const shareResult = await tryShareExcel({
        file: excelFile,
        projectInfo,
        totalScore: scores.totalScore,
      });

      if (shareResult.status === 'shared') {
        setNotice('공유 메뉴를 열었습니다.');
        return;
      }

      if (shareResult.status === 'cancelled') {
        setNotice('');
        return;
      }

      downloadExcelBlob(excel.blob, excel.fileName);
      setMailFallback({
        fileName: excel.fileName,
        fileSize: excel.size,
        status: shareResult.status,
        reason: shareResult.reason,
        diagnostics: shareResult.diagnostics,
        mailtoHref: createEvaluationMailtoHref({
          projectInfo,
          totalScore: scores.totalScore,
        }),
      });
      setNotice('');
    } catch (error) {
      console.error(error);

      const errorMessage = String(error?.message || '');

      setNotice(errorMessage.startsWith('Template load failed')
        ? 'Excel 템플릿 파일을 불러오지 못했습니다.'
        : '시공평가표 생성 중 오류가 발생했습니다.');
    } finally {
      setExcelAction('');
    }
  };

  const shareStoredEvaluationExcel = async () => {
    if (!selectedEvaluation) return;

    setDetailAction('share');
    setDetailNotice('평가표 생성 중...');

    try {
      const excel = await createEvaluationExcelBlobFromEvaluation(selectedEvaluation);

      let excelFile;
      try {
        excelFile = createShareFile(excel.blob, excel.fileName);
      } catch (error) {
        console.error('Failed to create Excel File object.', error);
        downloadExcelBlob(excel.blob, excel.fileName);
        setDetailNotice('공유를 지원하지 않아 Excel 파일만 다운로드했습니다.');
        return;
      }

      const shareResult = await tryShareExcel({
        file: excelFile,
        projectInfo: selectedEvaluation.projectInfo,
        totalScore: selectedEvaluation.totalScore,
      });

      if (shareResult.status === 'shared') {
        setDetailNotice('공유 메뉴를 열었습니다.');
        return;
      }

      if (shareResult.status === 'cancelled') {
        setDetailNotice('');
        return;
      }

      downloadExcelBlob(excel.blob, excel.fileName);
      setDetailNotice('공유가 어려워 Excel 파일만 다운로드했습니다.');
    } catch (error) {
      console.error('Failed to regenerate Excel.', error);
      setDetailNotice(String(error?.message || '').startsWith('Template load failed')
        ? 'Excel 템플릿 파일을 불러오지 못했습니다.'
        : '시공평가표 생성 중 오류가 발생했습니다.');
    } finally {
      setDetailAction('');
    }
  };

  const openStoredEvaluation = (evaluation) => {
    setSelectedEvaluation(evaluation);
    setDetailNotice('');
    setActiveView('detail');
  };

  const editStoredEvaluation = () => {
    if (!selectedEvaluation) return;

    setCurrentEvaluationId(selectedEvaluation.id);
    setProjectInfo({
      ...initialProjectInfo,
      ...(selectedEvaluation.projectInfo ?? {}),
    });
    setAnswers(selectedEvaluation.evaluationResults ?? {});
    setNotes(selectedEvaluation.evaluationNotes ?? {});
    setIsProjectInfoOpen(true);
    setOpenSections(initialOpenSections);
    setMailFallback(null);
    setNotice('저장된 평가 수정 중입니다.');
    setActiveView('edit');
  };

  const deleteStoredEvaluation = async () => {
    if (!selectedEvaluation) return;

    const confirmed = window.confirm('이 평가 결과를 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다.');
    if (!confirmed) return;

    try {
      await deleteEvaluation(selectedEvaluation.id);
      if (currentEvaluationId === selectedEvaluation.id) {
        setCurrentEvaluationId('');
      }
      setSelectedEvaluation(null);
      await loadEvaluationHistory();
      setActiveView('history');
      setNotice('평가 결과가 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete evaluation.', error);
      setDetailNotice('평가 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const openMailComposer = () => {
    if (!mailFallback?.mailtoHref) return;
    window.location.href = mailFallback.mailtoHref;
  };

  const openHistory = () => {
    loadEvaluationHistory();
    setActiveView('history');
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p>전북ES</p>
          <h1>시공평가</h1>
        </div>
        <div className="header-actions" aria-label="주요 작업">
          <button
            type="button"
            className="header-action-save"
            onClick={saveCurrentEvaluation}
            disabled={activeView !== 'edit' || isSavingEvaluation}
          >
            <AppIcon name="clipboard" />
            <span>{isSavingEvaluation ? '저장 중' : '평가 저장'}</span>
          </button>
          <button
            type="button"
            className={`header-action ${activeView === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveView('edit')}
          >
            <AppIcon name="edit" />
            <span>평가 작성</span>
          </button>
          <button
            type="button"
            className={`header-action ${activeView === 'history' || activeView === 'detail' ? 'active' : ''}`}
            onClick={openHistory}
          >
            <AppIcon name="list" />
            <span>평가 리스트</span>
          </button>
          {activeView === 'detail' && selectedEvaluation && (
            <button
              type="button"
              className="header-action header-action-edit"
              onClick={editStoredEvaluation}
            >
              <AppIcon name="edit" />
              <span>수정하기</span>
            </button>
          )}
          <button
            type="button"
            className="header-action"
            onClick={startNewEvaluation}
          >
            <AppIcon name="reset" />
            <span>초기화</span>
          </button>
          <button
            type="button"
            className="theme-toggle"
            aria-label={isDarkMode ? '라이트모드로 전환' : '다크모드로 전환'}
            aria-pressed={isDarkMode}
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          >
            <AppIcon name={isDarkMode ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>

      <main>
        {activeView === 'edit' && (
          <>
            {currentEvaluationId && (
              <div className="edit-status">
                <AppIcon name="edit" />
                <span>저장된 평가 수정 중</span>
              </div>
            )}

            <section className="project-accordion">
              <button
                type="button"
                className="project-toggle"
                aria-expanded={isProjectInfoOpen}
                aria-controls="project-info-panel"
                onClick={() => setIsProjectInfoOpen((current) => !current)}
              >
                <div className="project-toggle-icon">
                  <AppIcon name="clipboard" />
                </div>
                <div>
                  <span className="project-toggle-label">
                    <AppIcon name={isProjectInfoOpen ? 'chevronDown' : 'chevronRight'} />
                    공사정보
                  </span>
                  <strong>
                    {[projectInfo.projectNumber, projectInfo.projectName].filter(Boolean).join(' · ') || '공사정보 입력'}
                  </strong>
                </div>
              </button>
              {isProjectInfoOpen && (
                <div id="project-info-panel">
                  <ProjectInfoForm value={projectInfo} onChange={handleProjectInfoChange} />
                </div>
              )}
            </section>
            <ScoreSummary {...scores} lastSavedAt={formatSavedAt(lastSavedAt)} />

            {groupedItems.map(({ category, items }) => (
              <EvaluationSection
                key={category}
                title={category}
                items={items}
                answers={answers}
                notes={notes}
                getScore={getScore}
                onAnswerChange={handleAnswerChange}
                onNoteChange={handleNoteChange}
                isOpen={openSections[category]}
                onToggle={() => toggleSection(category)}
              />
            ))}

            <div className="actions">
              {notice && <p className="notice">{notice}</p>}
              {mailFallback && (
                <div className="mail-fallback-card" role="status">
                  <strong>Excel 파일을 저장했습니다.</strong>
                  <p>
                    이 기기에서는 Excel 파일을 메일앱에 자동 첨부할 수 없습니다.
                    메일 앱이 열리면 방금 저장한 시공평가표를 첨부해주세요.
                  </p>
                  <button type="button" onClick={openMailComposer}>
                    <AppIcon name="mail" />
                    메일 작성 열기
                  </button>
                  <small>{mailFallback.fileName}</small>
                </div>
              )}
              <button
                type="button"
                className="primary-button"
                onClick={shareOrDownloadEvaluationExcel}
                disabled={Boolean(excelAction)}
              >
                <span className="button-icon"><AppIcon name="share" /></span>
                <span>
                  <strong>{excelAction === 'share' ? '평가표 생성 중...' : 'Excel 생성 및 공유'}</strong>
                  <small>Android 공유창으로 메일 앱에 전달</small>
                </span>
              </button>
            </div>
          </>
        )}

        {activeView === 'history' && (
          <EvaluationList
            evaluations={evaluations}
            isLoading={isHistoryLoading}
            searchTerm={historySearch}
            onSearchChange={setHistorySearch}
            onOpenEvaluation={openStoredEvaluation}
            onNewEvaluation={() => setActiveView('edit')}
          />
        )}

        {activeView === 'detail' && (
          <EvaluationDetail
            evaluation={selectedEvaluation}
            groupedItems={groupedItems}
            detailNotice={detailNotice}
            detailAction={detailAction}
            onBack={openHistory}
            onShare={shareStoredEvaluationExcel}
            onDelete={deleteStoredEvaluation}
          />
        )}
      </main>
    </div>
  );
}
