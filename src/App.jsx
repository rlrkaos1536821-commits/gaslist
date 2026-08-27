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
  getAllEvaluations,
  saveEvaluation,
  TASK_STATUSES,
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
const TASK_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'active', label: '진행 중' },
  { id: 'completed', label: '완료' },
];

const statusLabels = {
  [TASK_STATUSES.NEW]: '신규',
  [TASK_STATUSES.IN_PROGRESS]: '작성 중',
  [TASK_STATUSES.DRAFT]: '임시저장',
  [TASK_STATUSES.COMPLETED]: '평가 완료',
  [TASK_STATUSES.EDITING]: '수정 중',
};

function groupItemsByCategory(items) {
  return categoryOrder.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  }));
}

function createEvaluationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `task_${crypto.randomUUID()}`;
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function calculateScores(evaluationResults) {
  const basicScore = basicItems.reduce((sum, item) => sum + getItemScore(item, evaluationResults[item.id]), 0);
  const adjustmentScore = evaluationItems
    .filter((item) => item.scoreType === 'adjustment')
    .reduce((sum, item) => sum + getItemScore(item, evaluationResults[item.id]), 0);
  const completedCount = evaluationItems.filter((item) => isAnswered(evaluationResults[item.id])).length;
  const unevaluatedCount = evaluationItems.length - completedCount;

  return {
    basicScore,
    adjustmentScore,
    totalScore: basicScore + adjustmentScore,
    completedCount,
    totalCount: evaluationItems.length,
    unevaluatedCount,
  };
}

function buildSearchText(task) {
  const info = task.projectInfo ?? {};
  return [info.projectName, info.projectNumber, info.contractor].join(' ').toLowerCase();
}

function hasProjectInfo(projectInfo) {
  return Object.values(projectInfo ?? {}).some((value) => String(value ?? '').trim());
}

function hasDraftContent(draft) {
  return Boolean(
    draft
    && (
      hasProjectInfo(draft.projectInfo)
      || Object.keys(draft.evaluationResults ?? {}).length > 0
      || Object.keys(draft.evaluationNotes ?? {}).length > 0
    ),
  );
}

function getTaskTitle(task) {
  return task.projectInfo?.projectName || '공사명 미입력';
}

function getTaskProgress(task) {
  const totalCount = task.totalCount || evaluationItems.length;
  const completedCount = task.completedCount ?? calculateScores(task.evaluationResults ?? {}).completedCount;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return { completedCount, totalCount, percent };
}

function getAutoStatus(currentStatus, answers) {
  if (currentStatus === TASK_STATUSES.EDITING) return TASK_STATUSES.EDITING;
  if (currentStatus === TASK_STATUSES.COMPLETED) return TASK_STATUSES.COMPLETED;
  if (Object.values(answers ?? {}).some(isAnswered)) return TASK_STATUSES.IN_PROGRESS;
  return currentStatus || TASK_STATUSES.NEW;
}

function getDetailScoreClass(score) {
  if (score <= 0) return 'score-zero';
  if (score < 3) return 'score-low';
  return 'score-positive';
}

function getTotalScoreClass(score) {
  if (score >= 90) return 'score-grade-high';
  if (score >= 70) return 'score-grade-middle';
  return 'score-grade-low';
}

function TaskList({
  tasks,
  isLoading,
  searchTerm,
  activeFilter,
  onFilterChange,
  onSearchChange,
  onOpenTask,
  onNewTask,
  onDeleteTask,
}) {
  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const isCompleted = task.status === TASK_STATUSES.COMPLETED;
      const matchesFilter =
        activeFilter === 'all'
        || (activeFilter === 'completed' && isCompleted)
        || (activeFilter === 'active' && !isCompleted);
      const matchesSearch = !normalizedSearch || buildSearchText(task).includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchTerm, tasks]);

  const activeCount = tasks.filter((task) => task.status !== TASK_STATUSES.COMPLETED).length;
  const completedCount = tasks.length - activeCount;

  return (
    <section className="history-view task-list-view" aria-label="작업 리스트">
      <div className="history-heading task-heading">
        <div className="task-heading-icon">
          <AppIcon name="list" />
        </div>
        <div>
          <span>최근 작업한 순서</span>
          <h2>작업 리스트</h2>
        </div>
        <strong>{tasks.length}건</strong>
      </div>

      <button type="button" className="primary-button task-create-button compact-action" onClick={onNewTask}>
        <span className="button-icon"><AppIcon name="play" /></span>
        <span>
          <strong>새 작업 만들기</strong>
          <small>공사정보 입력부터 시작</small>
        </span>
      </button>

      <label className="history-search">
        <AppIcon name="search" />
        <input
          type="search"
          value={searchTerm}
          placeholder="공사명, 공사번호, 협력사 검색"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      <div className="task-filters" role="tablist" aria-label="작업 필터">
        {TASK_FILTERS.map((filter) => (
          <button
            type="button"
            key={filter.id}
            className={activeFilter === filter.id ? 'active' : ''}
            onClick={() => onFilterChange(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <p className="task-count-summary">진행 중 {activeCount}건 · 완료 {completedCount}건</p>

      {isLoading ? (
        <p className="history-message">작업을 불러오는 중입니다.</p>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-history">
          <strong>표시할 작업이 없습니다.</strong>
          <p>새 작업을 만들면 작성 중인 평가도 이곳에 자동으로 저장됩니다.</p>
        </div>
      ) : (
        <div className="history-list">
          {filteredTasks.map((task) => {
            const info = task.projectInfo ?? {};
            const progress = getTaskProgress(task);
            const isCompleted = task.status === TASK_STATUSES.COMPLETED;
            return (
              <article className="task-card-shell" key={task.id}>
                <button
                  type="button"
                  className={`history-card task-card status-${task.status}`}
                  onClick={() => onOpenTask(task)}
                >
                  <div className="history-card-main">
                    <div className="task-card-title-row">
                      <strong>{getTaskTitle(task)}</strong>
                      <span className={`status-badge status-badge-${task.status}`}>
                        {statusLabels[task.status] ?? '작성 중'}
                      </span>
                    </div>
                    <span>{info.projectNumber || '공사번호 미입력'}</span>
                    {isCompleted ? (
                      <em>평가 완료 · {task.totalScore}점</em>
                    ) : (
                      <>
                        <div className="task-progress" aria-label={`진행률 ${progress.percent}%`}>
                          <span style={{ width: `${progress.percent}%` }} />
                        </div>
                        <em>{progress.percent}% · {progress.completedCount}/{progress.totalCount} 항목 완료</em>
                      </>
                    )}
                    <small>
                      {[info.contractor || '시공협력사 미입력', formatDateForDisplay(task.updatedAt, { includeTime: true })]
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                  </div>
                <div className={`history-score task-score ${isCompleted ? getTotalScoreClass(task.totalScore) : ''}`}>
                  <strong>{isCompleted ? task.totalScore : progress.percent}</strong>
                  <span>{isCompleted ? '점' : '%'}</span>
                </div>
                </button>
                <button
                  type="button"
                  className="task-card-delete"
                  aria-label={`${getTaskTitle(task)} 작업 삭제`}
                  onClick={() => onDeleteTask(task)}
                >
                  <AppIcon name="trash" />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProjectSetup({ projectInfo, saveStateText, onProjectInfoChange, onBack, onStartEvaluation }) {
  return (
    <section className="project-setup-view" aria-label="새 작업 공사정보">
      <button type="button" className="back-button" onClick={onBack}>
        <AppIcon name="arrowLeft" />
        작업 리스트
      </button>

      <div className="setup-heading">
        <span>새 시공평가</span>
        <h2>{projectInfo.projectName || '공사정보 입력'}</h2>
        <p>{saveStateText}</p>
      </div>

      <ProjectInfoForm value={projectInfo} onChange={onProjectInfoChange} />

      <div className="actions">
        <button type="button" className="primary-button" onClick={onStartEvaluation}>
          <span className="button-icon"><AppIcon name="play" /></span>
          <span>
            <strong>평가 시작</strong>
            <small>입력한 공사정보로 평가 작성</small>
          </span>
        </button>
      </div>
    </section>
  );
}

function EvaluationDetail({
  task,
  groupedItems,
  detailNotice,
  detailAction,
  detailMailFallback,
  onBack,
  onShare,
  onEdit,
  onDelete,
  onOpenMailComposer,
}) {
  if (!task) {
    return (
      <section className="history-view">
        <p className="history-message">선택한 작업을 찾을 수 없습니다.</p>
        <button type="button" className="ghost-button compact-action" onClick={onBack}>
          <span className="button-icon"><AppIcon name="arrowLeft" /></span>
          <span>
            <strong>작업 리스트로</strong>
            <small>작업 리스트로 이동</small>
          </span>
        </button>
      </section>
    );
  }

  const info = task.projectInfo ?? {};
  const getStoredScore = (item) => getItemScore(item, task.evaluationResults[item.id]);

  return (
    <section className="detail-view" aria-label="평가 완료 상세">
      <button type="button" className="back-button" onClick={onBack}>
        <AppIcon name="arrowLeft" />
        작업 리스트
      </button>

      <div className="detail-hero">
        <div>
          <span>{statusLabels[task.status] ?? '평가 완료'} · {formatDateForDisplay(task.updatedAt, { includeTime: true })}</span>
          <h2>{info.projectName || '공사명 미입력'}</h2>
          <p>{info.projectNumber || '공사번호 미입력'}</p>
        </div>
        <strong className={getTotalScoreClass(task.totalScore)}>{task.totalScore}점</strong>
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
          <dt>공사규모(m)</dt>
          <dd>{info.scale || '-'}</dd>
        </div>
      </dl>

      <div className="detail-score-grid">
        <div>
          <span>기본점수</span>
          <strong>{task.basicScore}점</strong>
        </div>
        <div>
          <span>가·감점</span>
          <strong>{task.adjustmentScore > 0 ? `+${task.adjustmentScore}` : task.adjustmentScore}점</strong>
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
                {items.map((item) => {
                  const itemScore = getStoredScore(item);
                  return (
                    <div className="detail-item" key={item.id}>
                      <span>{item.excelCell}</span>
                      <p>{item.title}</p>
                      <em>{String(task.evaluationResults[item.id] ?? '-')}</em>
                      {task.evaluationNotes?.[item.id] && (
                        <small>{task.evaluationNotes[item.id]}</small>
                      )}
                      <strong className={getDetailScoreClass(itemScore)}>{itemScore}점</strong>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="actions">
        {detailNotice && <p className="notice">{detailNotice}</p>}
        {detailMailFallback && (
          <div className="mail-fallback-card" role="status">
            <strong>Excel 파일을 저장했습니다.</strong>
            <p>
              공유창을 바로 열 수 없는 경우 메일 작성 화면을 열고, 방금 저장된 Excel 파일을 첨부해주세요.
            </p>
            <button type="button" onClick={onOpenMailComposer}>
              <AppIcon name="mail" />
              메일 작성 열기
            </button>
            <small>{detailMailFallback.fileName}</small>
          </div>
        )}
        <button type="button" className="primary-button" onClick={onShare} disabled={Boolean(detailAction)}>
          <span className="button-icon"><AppIcon name="share" /></span>
          <span>
            <strong>{detailAction === 'share' ? 'Excel 생성 중...' : 'Excel 생성 및 공유'}</strong>
            <small>완료된 평가 데이터로 생성</small>
          </span>
        </button>
        <button type="button" className="secondary-button compact-action" onClick={onEdit}>
          <span className="button-icon"><AppIcon name="edit" /></span>
          <span>
            <strong>수정하기</strong>
            <small>평가 작성 화면으로 불러오기</small>
          </span>
        </button>
        <button type="button" className="danger-button compact-action" onClick={onDelete}>
          <span className="button-icon"><AppIcon name="trash" /></span>
          <span>
            <strong>작업 삭제</strong>
            <small>작성한 평가 내용도 함께 삭제</small>
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
  const [activeView, setActiveView] = useState('history');
  const [projectInfo, setProjectInfo] = useState(initialProjectInfo);
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [currentEvaluationId, setCurrentEvaluationId] = useState('');
  const [currentStatus, setCurrentStatus] = useState(TASK_STATUSES.NEW);
  const [notice, setNotice] = useState('');
  const [mailFallback, setMailFallback] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [saveStateText, setSaveStateText] = useState('');
  const [excelAction, setExcelAction] = useState('');
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [detailNotice, setDetailNotice] = useState('');
  const [detailAction, setDetailAction] = useState('');
  const [detailMailFallback, setDetailMailFallback] = useState(null);
  const [isProjectInfoOpen, setIsProjectInfoOpen] = useState(true);
  const [openSections, setOpenSections] = useState(initialOpenSections);
  const skipNextAutoSaveRef = useRef(false);
  const draftMigrationRef = useRef(false);

  const groupedItems = useMemo(() => groupItemsByCategory(evaluationItems), []);
  const scores = useMemo(() => calculateScores(answers), [answers]);
  const getScore = (item) => getItemScore(item, answers[item.id]);
  const isDarkMode = theme === 'dark';

  const buildTaskRecord = ({
    id = currentEvaluationId,
    status = currentStatus,
    createdAt,
    updatedAt,
    completedAt,
    lastExcelGeneratedAt,
    sourceProjectInfo = projectInfo,
    sourceAnswers = answers,
    sourceNotes = notes,
  } = {}) => {
    const now = new Date().toISOString();
    const existingTask = id ? tasks.find((task) => task.id === id) : null;
    const nextScores = calculateScores(sourceAnswers);

    return {
      id: id || createEvaluationId(),
      status,
      createdAt: createdAt || existingTask?.createdAt || now,
      updatedAt: updatedAt || now,
      completedAt: completedAt ?? existingTask?.completedAt ?? '',
      lastExcelGeneratedAt: lastExcelGeneratedAt ?? existingTask?.lastExcelGeneratedAt ?? '',
      projectInfo: sourceProjectInfo,
      evaluationResults: sourceAnswers,
      evaluationNotes: sourceNotes,
      basicScore: nextScores.basicScore,
      adjustmentScore: nextScores.adjustmentScore,
      totalScore: nextScores.totalScore,
      completedCount: nextScores.completedCount,
      totalCount: nextScores.totalCount,
    };
  };

  const loadTaskList = async () => {
    setIsHistoryLoading(true);
    try {
      const storedTasks = await getAllEvaluations();
      setTasks(storedTasks);
      return storedTasks;
    } catch (error) {
      console.error('Failed to load tasks.', error);
      setNotice('작업을 불러오는 중 오류가 발생했습니다.');
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
    const initializeTasks = async () => {
      const storedTasks = await loadTaskList();

      if (draftMigrationRef.current || !hasDraftContent(restoredDraft)) return;
      draftMigrationRef.current = true;

      const draftScores = calculateScores(restoredDraft.evaluationResults ?? {});
      const existingTask = restoredDraft.currentEvaluationId
        ? storedTasks.find((task) => task.id === restoredDraft.currentEvaluationId)
        : null;
      const now = new Date().toISOString();
      const migratedTask = {
        id: restoredDraft.currentEvaluationId || createEvaluationId(),
        status: existingTask?.status || TASK_STATUSES.DRAFT,
        createdAt: existingTask?.createdAt || restoredDraft.lastSavedAt || now,
        updatedAt: restoredDraft.lastSavedAt || now,
        completedAt: existingTask?.completedAt || '',
        lastExcelGeneratedAt: existingTask?.lastExcelGeneratedAt || '',
        projectInfo: {
          ...initialProjectInfo,
          ...(restoredDraft.projectInfo ?? {}),
        },
        evaluationResults: restoredDraft.evaluationResults ?? {},
        evaluationNotes: restoredDraft.evaluationNotes ?? {},
        basicScore: draftScores.basicScore,
        adjustmentScore: draftScores.adjustmentScore,
        totalScore: draftScores.totalScore,
        completedCount: draftScores.completedCount,
        totalCount: draftScores.totalCount,
      };

      try {
        await saveEvaluation(migratedTask);
        clearDraft();
        await loadTaskList();
        setNotice('기존 임시저장 데이터를 작업 리스트로 옮겼습니다.');
      } catch (error) {
        console.error('Failed to migrate draft.', error);
        setNotice('기존 임시저장 데이터를 옮기지 못했습니다.');
      }
    };

    initializeTasks();
  }, []);

  useEffect(() => {
    if (!currentEvaluationId || !['project', 'edit'].includes(activeView)) return undefined;

    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return undefined;
    }

    setSaveStateText('저장 중...');
    const saveTimer = window.setTimeout(async () => {
      const nextStatus = getAutoStatus(currentStatus, answers);
      const task = buildTaskRecord({ status: nextStatus });

      try {
        const savedTask = await saveEvaluation(task);
        saveDraft({
          currentEvaluationId: savedTask.id,
          projectInfo,
          evaluationResults: answers,
          evaluationNotes: notes,
        });
        setCurrentStatus(savedTask.status);
        setLastSavedAt(savedTask.updatedAt);
        setSaveStateText(`${formatSavedAt(savedTask.updatedAt)} 저장됨`);
        setTasks((current) => {
          const withoutSaved = current.filter((item) => item.id !== savedTask.id);
          return [savedTask, ...withoutSaved].sort((first, second) => String(second.updatedAt).localeCompare(String(first.updatedAt)));
        });
      } catch (error) {
        console.error('Failed to autosave task.', error);
        setSaveStateText('자동저장 실패');
      }
    }, 600);

    return () => window.clearTimeout(saveTimer);
  }, [activeView, currentEvaluationId, currentStatus, projectInfo, answers, notes]);

  const loadTaskIntoEditor = (task) => {
    skipNextAutoSaveRef.current = true;
    setCurrentEvaluationId(task.id);
    setCurrentStatus(task.status);
    setProjectInfo({
      ...initialProjectInfo,
      ...(task.projectInfo ?? {}),
    });
    setAnswers(task.evaluationResults ?? {});
    setNotes(task.evaluationNotes ?? {});
    setLastSavedAt(task.updatedAt ?? '');
    setSaveStateText(task.updatedAt ? `${formatSavedAt(task.updatedAt)} 저장됨` : '');
    setMailFallback(null);
    setNotice('');
    setIsProjectInfoOpen(!hasProjectInfo(task.projectInfo));
    setOpenSections(initialOpenSections);
  };

  const createNewTask = async () => {
    const now = new Date().toISOString();
    const newTask = {
      id: createEvaluationId(),
      status: TASK_STATUSES.NEW,
      createdAt: now,
      updatedAt: now,
      completedAt: '',
      lastExcelGeneratedAt: '',
      projectInfo: initialProjectInfo,
      evaluationResults: {},
      evaluationNotes: {},
      basicScore: 0,
      adjustmentScore: 0,
      totalScore: 0,
      completedCount: 0,
      totalCount: evaluationItems.length,
    };

    try {
      const savedTask = await saveEvaluation(newTask);
      clearDraft();
      await loadTaskList();
      loadTaskIntoEditor(savedTask);
      setActiveView('project');
      setNotice('');
    } catch (error) {
      console.error('Failed to create task.', error);
      setNotice('새 작업을 만들지 못했습니다.');
    }
  };

  const openTask = (task) => {
    setSelectedTask(task);
    setDetailNotice('');

    if (task.status === TASK_STATUSES.COMPLETED) {
      setActiveView('detail');
      return;
    }

    loadTaskIntoEditor(task);
    setActiveView(hasProjectInfo(task.projectInfo) ? 'edit' : 'project');
  };

  const returnToTaskList = async () => {
    await loadTaskList();
    setActiveView('history');
  };

  const updateProjectInfo = (nextProjectInfo) => {
    setProjectInfo((current) => (
      typeof nextProjectInfo === 'function' ? nextProjectInfo(current) : nextProjectInfo
    ));
    setNotice('');
    setMailFallback(null);
  };

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

  const startEvaluation = () => {
    setCurrentStatus((status) => (status === TASK_STATUSES.EDITING ? TASK_STATUSES.EDITING : TASK_STATUSES.IN_PROGRESS));
    setIsProjectInfoOpen(false);
    setActiveView('edit');
  };

  const saveCurrentTask = async () => {
    if (!currentEvaluationId) return;

    const nextStatus = getAutoStatus(currentStatus, answers);
    const task = buildTaskRecord({ status: nextStatus });

    try {
      const savedTask = await saveEvaluation(task);
      saveDraft({
        currentEvaluationId: savedTask.id,
        projectInfo,
        evaluationResults: answers,
        evaluationNotes: notes,
      });
      setCurrentStatus(savedTask.status);
      setLastSavedAt(savedTask.updatedAt);
      setSaveStateText(`${formatSavedAt(savedTask.updatedAt)} 저장됨`);
      setNotice('임시저장 되었습니다.');
      window.alert(`${statusLabels[savedTask.status] ?? '작성 중'} 상태로 임시저장 되었습니다.\n\n작업 리스트에서 다시 이어서 작성할 수 있습니다.`);
      await loadTaskList();
    } catch (error) {
      console.error('Failed to save task.', error);
      setNotice('작업 저장 중 오류가 발생했습니다.');
    }
  };

  const validateEvaluation = (purpose = '완료') => {
    const missingProjectFields = requiredProjectFields
      .filter(([field]) => !String(projectInfo[field] || '').trim())
      .map(([, label]) => label);

    if (missingProjectFields.length > 0) {
      setNotice(`필수 공사정보를 입력해주세요. (${missingProjectFields.join(', ')})`);
      setIsProjectInfoOpen(true);
      setActiveView('project');
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

  const completeTask = async () => {
    if (!currentEvaluationId) return;
    if (!validateEvaluation('평가 완료')) return;

    const confirmed = window.confirm('평가를 완료하시겠습니까?\n\n완료 후에도 수정할 수 있습니다.');
    if (!confirmed) return;

    const now = new Date().toISOString();
    const completedTask = buildTaskRecord({
      status: TASK_STATUSES.COMPLETED,
      updatedAt: now,
      completedAt: now,
    });

    try {
      const savedTask = await saveEvaluation(completedTask);
      clearDraft();
      setCurrentStatus(savedTask.status);
      setSelectedTask(savedTask);
      setNotice('');
      await loadTaskList();
      setActiveView('detail');
    } catch (error) {
      console.error('Failed to complete task.', error);
      setNotice('평가 완료 저장 중 오류가 발생했습니다.');
    }
  };

  const editCompletedTask = async () => {
    if (!selectedTask) return;

    const editingTask = {
      ...selectedTask,
      status: TASK_STATUSES.EDITING,
      updatedAt: new Date().toISOString(),
    };

    try {
      const savedTask = await saveEvaluation(editingTask);
      await loadTaskList();
      loadTaskIntoEditor(savedTask);
      setNotice('평가 수정 중입니다.');
      setActiveView('edit');
    } catch (error) {
      console.error('Failed to enter edit mode.', error);
      setDetailNotice('수정 모드로 전환하지 못했습니다.');
    }
  };

  const createExcelForAction = async () => createEvaluationExcelBlob({
    projectInfo,
    answers,
    notes,
    totalScore: scores.totalScore,
  });

  const shareOrDownloadEvaluationExcel = async () => {
    if (!validateEvaluation('Excel을 생성')) return;

    setExcelAction('share');
    setNotice('평가표 생성 중...');
    setMailFallback(null);

    try {
      const excel = await createExcelForAction();
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

      if (currentEvaluationId) {
        const generatedAt = new Date().toISOString();
        await saveEvaluation(buildTaskRecord({ lastExcelGeneratedAt: generatedAt }));
        await loadTaskList();
      }

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
    if (!selectedTask) return;

    setDetailAction('share');
    setDetailNotice('평가표 생성 중...');
    setDetailMailFallback(null);

    try {
      const excel = await createEvaluationExcelBlobFromEvaluation(selectedTask);

      let excelFile;
      try {
        excelFile = createShareFile(excel.blob, excel.fileName);
      } catch (error) {
        console.error('Failed to create Excel File object.', error);
        downloadExcelBlob(excel.blob, excel.fileName);
        setDetailMailFallback({
          fileName: excel.fileName,
          fileSize: excel.size,
          status: 'unsupported',
          reason: 'file-api-unavailable',
          mailtoHref: createEvaluationMailtoHref({
            projectInfo: selectedTask.projectInfo,
            totalScore: selectedTask.totalScore,
          }),
        });
        setDetailNotice('공유를 지원하지 않아 Excel 파일을 저장했습니다. 메일 작성 화면을 열어 첨부해주세요.');
        return;
      }

      const shareResult = await tryShareExcel({
        file: excelFile,
        projectInfo: selectedTask.projectInfo,
        totalScore: selectedTask.totalScore,
      });

      const updatedTask = {
        ...selectedTask,
        lastExcelGeneratedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveEvaluation(updatedTask);
      setSelectedTask(updatedTask);
      await loadTaskList();

      if (shareResult.status === 'shared') {
        setDetailNotice('공유 메뉴를 열었습니다.');
        return;
      }

      if (shareResult.status === 'cancelled') {
        setDetailNotice('');
        return;
      }

      downloadExcelBlob(excel.blob, excel.fileName);
      setDetailMailFallback({
        fileName: excel.fileName,
        fileSize: excel.size,
        status: shareResult.status,
        reason: shareResult.reason,
        diagnostics: shareResult.diagnostics,
        mailtoHref: createEvaluationMailtoHref({
          projectInfo: selectedTask.projectInfo,
          totalScore: selectedTask.totalScore,
        }),
      });
      setDetailNotice('공유가 어려워 Excel 파일을 저장했습니다. 메일 작성 화면을 열어 첨부해주세요.');
    } catch (error) {
      console.error('Failed to regenerate Excel.', error);
      setDetailNotice(String(error?.message || '').startsWith('Template load failed')
        ? 'Excel 템플릿 파일을 불러오지 못했습니다.'
        : '시공평가표 생성 중 오류가 발생했습니다.');
    } finally {
      setDetailAction('');
    }
  };

  const deleteSelectedTask = async () => {
    if (!selectedTask) return;

    const confirmed = window.confirm('이 작업을 삭제하시겠습니까?\n\n작성한 평가 내용도 함께 삭제됩니다.');
    if (!confirmed) return;

    try {
      await deleteEvaluation(selectedTask.id);
      if (currentEvaluationId === selectedTask.id) {
        setCurrentEvaluationId('');
      }
      setSelectedTask(null);
      await loadTaskList();
      setActiveView('history');
      setNotice('작업이 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete task.', error);
      setDetailNotice('작업 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const deleteTaskFromList = async (task) => {
    const confirmed = window.confirm('이 작업을 삭제하시겠습니까?\n\n작성한 평가 내용도 함께 삭제됩니다.');
    if (!confirmed) return;

    try {
      await deleteEvaluation(task.id);
      if (currentEvaluationId === task.id) {
        setCurrentEvaluationId('');
      }
      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
      }
      await loadTaskList();
      setNotice('작업이 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete task.', error);
      setNotice('작업 삭제 중 오류가 발생했습니다.');
    }
  };

  const openMailComposer = () => {
    if (!mailFallback?.mailtoHref) return;
    window.location.href = mailFallback.mailtoHref;
  };

  const openDetailMailComposer = () => {
    if (!detailMailFallback?.mailtoHref) return;
    window.location.href = detailMailFallback.mailtoHref;
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p>전북ES</p>
          <h1>시공평가</h1>
        </div>
        <div className="header-actions" aria-label="주요 작업">
          {activeView !== 'history' && (
            <button type="button" className="header-action" onClick={returnToTaskList}>
              <AppIcon name="arrowLeft" />
              <span>작업 리스트</span>
            </button>
          )}
          {activeView !== 'history' && (
            <button
              type="button"
              className="header-action header-action-new"
              onClick={createNewTask}
            >
              <AppIcon name="play" />
              <span>새 작업</span>
            </button>
          )}
          {activeView === 'edit' && (
            <button type="button" className="header-action header-action-save" onClick={saveCurrentTask}>
              <AppIcon name="clipboard" />
              <span>저장하기</span>
            </button>
          )}
          {activeView === 'edit' && (
            <button type="button" className="header-action header-action-edit" onClick={completeTask}>
              <AppIcon name="userCheck" />
              <span>평가 완료</span>
            </button>
          )}
          {activeView === 'detail' && selectedTask && (
            <button type="button" className="header-action header-action-edit" onClick={editCompletedTask}>
              <AppIcon name="edit" />
              <span>수정하기</span>
            </button>
          )}
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
        {activeView === 'history' && (
          <>
            {notice && <p className="notice">{notice}</p>}
            <TaskList
              tasks={tasks}
              isLoading={isHistoryLoading}
              searchTerm={taskSearch}
              activeFilter={taskFilter}
              onFilterChange={setTaskFilter}
              onSearchChange={setTaskSearch}
              onOpenTask={openTask}
              onNewTask={createNewTask}
              onDeleteTask={deleteTaskFromList}
            />
          </>
        )}

        {activeView === 'project' && (
          <ProjectSetup
            projectInfo={projectInfo}
            saveStateText={saveStateText || '작업 리스트에 자동저장됩니다.'}
            onProjectInfoChange={updateProjectInfo}
            onBack={returnToTaskList}
            onStartEvaluation={startEvaluation}
          />
        )}

        {activeView === 'edit' && (
          <>
            <div className="edit-context">
              <button type="button" className="back-button" onClick={returnToTaskList}>
                <AppIcon name="arrowLeft" />
                작업 리스트
              </button>
              <div>
                <span>{statusLabels[currentStatus] ?? '작성 중'}</span>
                <strong>{projectInfo.projectName || '공사명 미입력'}</strong>
                <small>{saveStateText || formatSavedAt(lastSavedAt) || '자동저장 대기 중'}</small>
              </div>
            </div>

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
                  <ProjectInfoForm value={projectInfo} onChange={updateProjectInfo} />
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
              <button type="button" className="save-button" onClick={saveCurrentTask}>
                <span className="button-icon"><AppIcon name="clipboard" /></span>
                <span>
                  <strong>저장하기</strong>
                  <small>작성 중 상태로 임시저장</small>
                </span>
              </button>
              <button type="button" className="primary-button" onClick={completeTask}>
                <span className="button-icon"><AppIcon name="clipboard" /></span>
                <span>
                  <strong>평가 완료</strong>
                  <small>완료 후 Excel 생성 화면으로 이동</small>
                </span>
              </button>
            </div>
          </>
        )}

        {activeView === 'detail' && (
          <EvaluationDetail
            task={selectedTask}
            groupedItems={groupedItems}
            detailNotice={detailNotice}
            detailAction={detailAction}
            detailMailFallback={detailMailFallback}
            onBack={returnToTaskList}
            onShare={shareStoredEvaluationExcel}
            onEdit={editCompletedTask}
            onDelete={deleteSelectedTask}
            onOpenMailComposer={openDetailMailComposer}
          />
        )}
      </main>
    </div>
  );
}
