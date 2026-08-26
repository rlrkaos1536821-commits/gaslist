import React, { useEffect, useMemo, useRef, useState } from 'react';
import AppIcon from './components/AppIcon.jsx';
import EvaluationSection from './components/EvaluationSection.jsx';
import ProjectInfoForm from './components/ProjectInfoForm.jsx';
import ScoreSummary from './components/ScoreSummary.jsx';
import { basicItems, evaluationItems } from './data/evaluationItems.js';
import { createEvaluationExcelBlob, downloadExcelBlob } from './services/excelService.js';
import { clearDraft, formatSavedAt, loadDraft, saveDraft } from './utils/draftStorage.js';
import { getItemScore, getUnevaluatedItems, isAnswered } from './utils/scoring.js';
import { shareEvaluationExcel } from './utils/shareUtils.js';

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
  const [projectInfo, setProjectInfo] = useState({
    ...initialProjectInfo,
    ...(restoredDraft?.projectInfo ?? {}),
  });
  const [answers, setAnswers] = useState(restoredDraft?.evaluationResults ?? {});
  const [notice, setNotice] = useState(restoredDraft ? '임시저장 데이터가 복원되었습니다.' : '');
  const [lastSavedAt, setLastSavedAt] = useState(restoredDraft?.lastSavedAt ?? '');
  const [excelAction, setExcelAction] = useState('');
  const [isProjectInfoOpen, setIsProjectInfoOpen] = useState(true);
  const [openSections, setOpenSections] = useState(initialOpenSections);
  const didMountRef = useRef(false);
  const skipNextAutoSaveRef = useRef(false);

  const groupedItems = useMemo(() => groupItemsByCategory(evaluationItems), []);

  const getScore = (item) => getItemScore(item, answers[item.id]);
  const isDarkMode = theme === 'dark';

  const scores = useMemo(() => {
    const basicScore = basicItems.reduce((sum, item) => sum + getItemScore(item, answers[item.id]), 0);
    const adjustmentScore = evaluationItems
      .filter((item) => item.scoreType === 'adjustment')
      .reduce((sum, item) => sum + getItemScore(item, answers[item.id]), 0);
    const unevaluatedCount = evaluationItems.filter((item) => !isAnswered(answers[item.id])).length;

    return {
      basicScore,
      adjustmentScore,
      totalScore: basicScore + adjustmentScore,
      unevaluatedCount,
    };
  }, [answers]);

  const handleAnswerChange = (item, value) => {
    setAnswers((current) => ({
      ...current,
      [item.id]: value,
    }));
    setNotice('');
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Failed to save theme.', error);
    }
  }, [theme]);

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
          projectInfo,
          evaluationResults: answers,
        });
        setLastSavedAt(draft.lastSavedAt);
      } catch (error) {
        console.error('Failed to save evaluation draft.', error);
      }
    }, 500);

    return () => window.clearTimeout(saveTimer);
  }, [projectInfo, answers]);

  const startNewEvaluation = () => {
    const confirmed = window.confirm('현재 작성 중인 평가내용과 임시저장 데이터를 삭제하시겠습니까?');
    if (!confirmed) return;

    clearDraft();
    skipNextAutoSaveRef.current = true;
    setProjectInfo(initialProjectInfo);
    setAnswers({});
    setLastSavedAt('');
    setIsProjectInfoOpen(true);
    setOpenSections(initialOpenSections);
    setNotice('새 평가가 시작되었습니다.');
  };

  const validateEvaluation = () => {
    const missingProjectFields = requiredProjectFields
      .filter(([field]) => !String(projectInfo[field] || '').trim())
      .map(([, label]) => label);

    if (missingProjectFields.length > 0) {
      setNotice(`필수 공사정보를 입력해주세요. (${missingProjectFields.join(', ')})`);
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
      setNotice(`아직 평가하지 않은 항목이 ${unevaluatedItems.length}개 있습니다. 모든 평가를 완료한 후 Excel을 생성해주세요. (${unevaluatedItems.map((item) => item.excelCell).join(', ')})`);
      return false;
    }

    return true;
  };

  const createExcelForAction = async () => createEvaluationExcelBlob({
    projectInfo,
    answers,
    totalScore: scores.totalScore,
  });

  const downloadEvaluationExcel = async () => {
    if (!validateEvaluation()) return;

    setExcelAction('download');
    setNotice('평가표 생성 중...');

    try {
      const excel = await createExcelForAction();
      downloadExcelBlob(excel.blob, excel.fileName);
      setNotice('Excel 파일을 다운로드했습니다.');
    } catch (error) {
      console.error(error);
      setNotice(error.message.startsWith('Template load failed')
        ? 'Excel 템플릿 파일을 불러오지 못했습니다.'
        : '시공평가표 생성 중 오류가 발생했습니다.');
    } finally {
      setExcelAction('');
    }
  };

  const shareOrDownloadEvaluationExcel = async () => {
    if (!validateEvaluation()) return;

    setExcelAction('share');
    setNotice('평가표 생성 중...');

    let excel;

    try {
      excel = await createExcelForAction();
      const shareResult = await shareEvaluationExcel({
        blob: excel.blob,
        fileName: excel.fileName,
        projectInfo,
        totalScore: scores.totalScore,
      });

      if (shareResult.shared) {
        setNotice('공유 메뉴를 열었습니다.');
        return;
      }

      if (shareResult.cancelled) {
        setNotice('');
        return;
      }

      setNotice(shareResult.reason === 'unsupported'
        ? '이 브라우저에서는 Excel 파일 공유를 지원하지 않습니다. 아래의 Excel만 다운로드 버튼을 사용해주세요.'
        : '메일 앱으로 파일을 전달하지 못했습니다. 다시 시도하거나 아래의 Excel만 다운로드 버튼을 사용해주세요.');
    } catch (error) {
      console.error(error);

      const errorMessage = String(error?.message || '');

      setNotice(errorMessage.startsWith('Template load failed')
        ? 'Excel 템플릿 파일을 불러오지 못했습니다.'
        : '파일 공유 중 오류가 발생했습니다. 다시 시도하거나 아래의 Excel만 다운로드 버튼을 사용해주세요.');
    } finally {
      setExcelAction('');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p>전북ES</p>
          <h1>시공평가</h1>
        </div>
        <button
          type="button"
          className="theme-toggle"
          aria-label={isDarkMode ? '라이트모드로 전환' : '다크모드로 전환'}
          aria-pressed={isDarkMode}
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        >
          <AppIcon name={isDarkMode ? 'sun' : 'moon'} />
        </button>
      </header>

      <main>
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
              <ProjectInfoForm value={projectInfo} onChange={setProjectInfo} />
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
            getScore={getScore}
            onAnswerChange={handleAnswerChange}
            isOpen={openSections[category]}
            onToggle={() => toggleSection(category)}
          />
        ))}

        <div className="actions">
          {notice && <p className="notice">{notice}</p>}
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
          <button
            type="button"
            className="secondary-button"
            onClick={downloadEvaluationExcel}
            disabled={Boolean(excelAction)}
          >
            <span className="button-icon"><AppIcon name="download" /></span>
            <span>
              <strong>{excelAction === 'download' ? 'Excel 생성 중...' : 'Excel만 다운로드'}</strong>
              <small>공유하지 않고 파일만 저장</small>
            </span>
          </button>
          <button type="button" className="ghost-button" onClick={startNewEvaluation}>
            <span className="button-icon"><AppIcon name="play" /></span>
            <span>
              <strong>새 평가 시작</strong>
              <small>새로운 평가를 시작합니다</small>
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
