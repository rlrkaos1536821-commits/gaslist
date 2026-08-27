import { evaluationItems } from '../data/evaluationItems.js';
import { PROJECT_CELL_MAP, SCORE_DISPLAY_CELL, TEMPLATE_URL, TOTAL_SCORE_CELL } from '../data/excelCellMap.js';
import { formatDateForExcel, getTodayFileStamp } from '../utils/dateUtils.js';
import { getItemScore } from '../utils/scoring.js';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function sanitizeFilePart(value, fallback) {
  const text = String(value || fallback)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '')
    .trim();
  return (text || fallback).slice(0, 40);
}

export function createEvaluationFileName(projectInfo) {
  const projectNumber = sanitizeFilePart(projectInfo.projectNumber, '공사번호없음');
  const projectName = sanitizeFilePart(projectInfo.projectName, '공사명없음');
  return `시공평가표_${projectNumber}_${projectName}_${getTodayFileStamp()}.xlsx`;
}

function setCellValue(worksheet, address, value) {
  worksheet.getCell(address).value = value ?? '';
}

function writeProjectInfo(worksheet, projectInfo) {
  const formattedStartDate = formatDateForExcel(projectInfo.startDate);
  const formattedEndDate = formatDateForExcel(projectInfo.endDate);
  const projectPeriod = [formattedStartDate, formattedEndDate].filter(Boolean).join(' ~ ');

  setCellValue(worksheet, PROJECT_CELL_MAP.projectNumber, projectInfo.projectNumber);
  setCellValue(worksheet, PROJECT_CELL_MAP.contractor, projectInfo.contractor);
  setCellValue(worksheet, PROJECT_CELL_MAP.projectName, projectInfo.projectName);
  setCellValue(worksheet, PROJECT_CELL_MAP.manager, projectInfo.manager);
  setCellValue(worksheet, PROJECT_CELL_MAP.scale, projectInfo.scale);
  setCellValue(worksheet, PROJECT_CELL_MAP.projectPeriod, projectPeriod);
}

function writeEvaluationScores(worksheet, answers) {
  evaluationItems.forEach((item) => {
    setCellValue(worksheet, item.excelCell, getItemScore(item, answers[item.id]));
  });
}

function getEvaluationNoteCell(excelCell) {
  const rowNumber = String(excelCell).match(/\d+/)?.[0];
  return rowNumber ? `G${rowNumber}` : '';
}

function writeEvaluationNotes(worksheet, notes = {}) {
  evaluationItems.forEach((item) => {
    const noteCell = getEvaluationNoteCell(item.excelCell);
    if (!noteCell) return;
    setCellValue(worksheet, noteCell, notes[item.id] || '');
  });
}

function preserveTotalFormulaOrSetValue(worksheet, totalScore) {
  const totalCell = worksheet.getCell(TOTAL_SCORE_CELL);
  const formula = totalCell.formula || 'SUM(D7:D36)';

  totalCell.value = {
    formula,
    result: totalScore,
  };
  return 'formula-with-cached-result';
}

function writeScoreDisplay(worksheet, totalScore) {
  setCellValue(worksheet, SCORE_DISPLAY_CELL, `${totalScore}점`);
}

export function downloadExcelBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function createEvaluationExcelBlob({ projectInfo, answers, notes = {}, totalScore }) {
  const { default: ExcelJS } = await import('exceljs');
  const response = await fetch(TEMPLATE_URL);

  if (!response.ok) {
    throw new Error(`Template load failed: ${response.status} ${response.statusText}`);
  }

  const templateBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Template worksheet was not found.');
  }

  writeProjectInfo(worksheet, projectInfo);
  writeEvaluationScores(worksheet, answers);
  writeEvaluationNotes(worksheet, notes);
  writeScoreDisplay(worksheet, totalScore);
  const totalHandling = preserveTotalFormulaOrSetValue(worksheet, totalScore);

  const outputBuffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([outputBuffer], {
    type: XLSX_MIME,
  });
  const fileName = createEvaluationFileName(projectInfo);

  return {
    blob,
    fileName,
    size: blob.size,
    totalHandling,
  };
}

export async function createEvaluationExcelBlobFromEvaluation(evaluation) {
  return createEvaluationExcelBlob({
    projectInfo: evaluation.projectInfo,
    answers: evaluation.evaluationResults,
    notes: evaluation.evaluationNotes,
    totalScore: evaluation.totalScore,
  });
}

export async function generateEvaluationExcel({ projectInfo, answers, notes = {}, totalScore }) {
  const excel = await createEvaluationExcelBlob({ projectInfo, answers, notes, totalScore });
  downloadExcelBlob(excel.blob, excel.fileName);

  return {
    fileName: excel.fileName,
    size: excel.size,
    totalHandling: excel.totalHandling,
  };
}
