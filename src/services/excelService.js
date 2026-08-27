import { evaluationItems } from '../data/evaluationItems.js';
import { PROJECT_CELL_MAP, SCORE_DISPLAY_CELL, TEMPLATE_URL, TOTAL_SCORE_CELL } from '../data/excelCellMap.js';
import { formatDateForExcel, getTodayFileStamp } from '../utils/dateUtils.js';
import { getItemScore } from '../utils/scoring.js';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PHOTO_SHEET_NAME = '평가 사진';
const PHOTO_MAX_WIDTH = 300;
const PHOTO_MAX_HEIGHT = 220;

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

function getPhotoSize(width, height) {
  if (!width || !height) return { width: PHOTO_MAX_WIDTH, height: PHOTO_MAX_HEIGHT };

  const ratio = Math.min(PHOTO_MAX_WIDTH / width, PHOTO_MAX_HEIGHT / height, 1);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function getPhotosByItem(photos = []) {
  return photos.reduce((grouped, photo) => {
    const itemId = photo.evaluationItemId;
    if (!itemId || !photo.blob) return grouped;
    return {
      ...grouped,
      [itemId]: [...(grouped[itemId] ?? []), photo].sort((first, second) => (first.order ?? 0) - (second.order ?? 0)),
    };
  }, {});
}

function stylePhotoSheetCell(cell, fillColor = 'FFFFFFFF') {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: fillColor },
  };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };
  cell.alignment = { vertical: 'middle', wrapText: true };
}

async function writePhotoSheet(workbook, { projectInfo, answers, photos = [] }) {
  if (!photos.length) return 0;

  const existingSheet = workbook.getWorksheet(PHOTO_SHEET_NAME);
  if (existingSheet) workbook.removeWorksheet(existingSheet.id);

  const worksheet = workbook.addWorksheet(PHOTO_SHEET_NAME);
  worksheet.properties.defaultRowHeight = 22;
  worksheet.columns = [
    { width: 10 },
    { width: 18 },
    { width: 18 },
    { width: 10 },
    { width: 10 },
    { width: 18 },
    { width: 18 },
    { width: 10 },
  ];

  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '시공평가 현장사진';
  titleCell.font = { bold: true, size: 18, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells('A3:B3');
  worksheet.getCell('A3').value = `공사명: ${projectInfo.projectName || '-'}`;
  worksheet.mergeCells('C3:D3');
  worksheet.getCell('C3').value = `공사번호: ${projectInfo.projectNumber || '-'}`;
  worksheet.mergeCells('E3:F3');
  worksheet.getCell('E3').value = `시공협력사: ${projectInfo.contractor || '-'}`;
  worksheet.mergeCells('G3:H3');
  worksheet.getCell('G3').value = `시공관리자: ${projectInfo.manager || '-'}`;
  ['A3', 'C3', 'E3', 'G3'].forEach((address) => {
    worksheet.getCell(address).font = { bold: true, color: { argb: 'FF334155' } };
    worksheet.getCell(address).alignment = { vertical: 'middle', wrapText: true };
  });
  worksheet.getRow(3).height = 26;

  const photosByItem = getPhotosByItem(photos);
  let row = 5;
  let writtenPhotoCount = 0;

  for (const item of evaluationItems) {
    const itemPhotos = photosByItem[item.id] ?? [];
    if (!itemPhotos.length) continue;

    worksheet.mergeCells(row, 1, row, 8);
    const itemTitleCell = worksheet.getCell(row, 1);
    itemTitleCell.value = `${item.category} / ${item.excelCell} / ${item.title}`;
    itemTitleCell.font = { bold: true, size: 13, color: { argb: 'FF1D4ED8' } };
    itemTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEFF6FF' },
    };
    itemTitleCell.alignment = { vertical: 'middle' };
    worksheet.getRow(row).height = 24;
    row += 1;

    worksheet.mergeCells(row, 1, row, 8);
    const answerCell = worksheet.getCell(row, 1);
    const answer = answers[item.id] || '-';
    answerCell.value = `평가값: ${answer} / 계산점수: ${getItemScore(item, answers[item.id])}점`;
    answerCell.font = { color: { argb: 'FF475569' } };
    answerCell.alignment = { vertical: 'middle' };
    worksheet.getRow(row).height = 22;
    row += 1;

    for (let index = 0; index < itemPhotos.length; index += 2) {
      const pair = itemPhotos.slice(index, index + 2);
      worksheet.getRow(row).height = 20;
      pair.forEach((photo, pairIndex) => {
        const startCol = pairIndex === 0 ? 1 : 5;
        worksheet.mergeCells(row, startCol, row, startCol + 3);
        const labelCell = worksheet.getCell(row, startCol);
        labelCell.value = `사진 ${index + pairIndex + 1}`;
        labelCell.font = { bold: true, color: { argb: 'FF0F172A' } };
        stylePhotoSheetCell(labelCell, 'FFF8FAFC');
      });
      row += 1;

      worksheet.getRow(row).height = 170;
      for (const [pairIndex, photo] of pair.entries()) {
        const startCol = pairIndex === 0 ? 1 : 5;
        worksheet.mergeCells(row, startCol, row, startCol + 3);
        const frameCell = worksheet.getCell(row, startCol);
        stylePhotoSheetCell(frameCell);

        const imageBuffer = await photo.blob.arrayBuffer();
        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension: 'jpeg',
        });
        const size = getPhotoSize(photo.width, photo.height);
        worksheet.addImage(imageId, {
          tl: { col: startCol - 1 + 0.08, row: row - 1 + 0.12 },
          ext: size,
          editAs: 'oneCell',
        });
        writtenPhotoCount += 1;
      }
      row += 2;
    }
  }

  return writtenPhotoCount;
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

export async function createEvaluationExcelBlob({ projectInfo, answers, notes = {}, totalScore, photos = [] }) {
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
  const photoCount = await writePhotoSheet(workbook, { projectInfo, answers, photos });

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
    photoCount,
  };
}

export async function createEvaluationExcelBlobFromEvaluation(evaluation, photos = []) {
  return createEvaluationExcelBlob({
    projectInfo: evaluation.projectInfo,
    answers: evaluation.evaluationResults,
    notes: evaluation.evaluationNotes,
    totalScore: evaluation.totalScore,
    photos,
  });
}

export async function generateEvaluationExcel({ projectInfo, answers, notes = {}, totalScore, photos = [] }) {
  const excel = await createEvaluationExcelBlob({ projectInfo, answers, notes, totalScore, photos });
  downloadExcelBlob(excel.blob, excel.fileName);

  return {
    fileName: excel.fileName,
    size: excel.size,
    totalHandling: excel.totalHandling,
  };
}
