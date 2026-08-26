import { XLSX_MIME } from '../services/excelService.js';

const EMPTY_RECIPIENT = '';

function getShareDiagnostics(file) {
  let canShareFiles;

  try {
    canShareFiles = navigator.canShare?.({
      files: [file],
    });
  } catch (error) {
    console.error('Failed to check XLSX file sharing support.', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
    canShareFiles = false;
  }

  return {
    secureContext: window.isSecureContext,
    hasNavigatorShare: typeof navigator.share === 'function',
    hasNavigatorCanShare: typeof navigator.canShare === 'function',
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    canShareFiles,
  };
}

function logShareError(error) {
  console.error('Excel share failed.', {
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
  });
}

function getShareText(projectInfo, totalScore) {
  return `${projectInfo.projectName} 시공평가 결과입니다.\n`
    + `공사번호: ${projectInfo.projectNumber}\n`
    + `평가점수: ${totalScore}점`;
}

export function createShareFile(blob, fileName) {
  return new File([blob], fileName, {
    type: XLSX_MIME,
    lastModified: Date.now(),
  });
}

export function canShareFile(file) {
  const diagnostics = getShareDiagnostics(file);
  console.log('Excel share diagnostics', diagnostics);

  return Boolean(
    diagnostics.secureContext
      && diagnostics.hasNavigatorShare
      && diagnostics.hasNavigatorCanShare
      && diagnostics.fileSize > 0
      && diagnostics.canShareFiles,
  );
}

export function createEvaluationMailtoHref({ projectInfo, totalScore, recipient = EMPTY_RECIPIENT }) {
  const subject = `[시공평가] ${projectInfo.projectName}`;
  const body = `${projectInfo.projectName} 시공평가 결과를 송부합니다.\n\n`
    + `공사번호: ${projectInfo.projectNumber}\n`
    + `평가점수: ${totalScore}점\n\n`
    + '다운로드된 시공평가표 Excel 파일을 첨부해주세요.';

  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function tryShareExcel({
  file,
  projectInfo,
  totalScore,
}) {
  const diagnostics = getShareDiagnostics(file);
  console.log('Excel share diagnostics', diagnostics);

  if (file.size <= 0) {
    return {
      status: 'failed',
      reason: 'empty-file',
      diagnostics,
    };
  }

  if (!diagnostics.secureContext) {
    return {
      status: 'unsupported',
      reason: 'insecure-context',
      diagnostics,
    };
  }

  if (!diagnostics.hasNavigatorShare || !diagnostics.hasNavigatorCanShare) {
    return {
      status: 'unsupported',
      reason: 'missing-web-share',
      diagnostics,
    };
  }

  if (!diagnostics.canShareFiles) {
    return {
      status: 'unsupported',
      reason: 'xlsx-file-not-shareable',
      diagnostics,
    };
  }

  const richPayload = {
    files: [file],
    title: `[시공평가] ${projectInfo.projectName}`,
    text: getShareText(projectInfo, totalScore),
  };
  const fileOnlyPayload = {
    files: [file],
  };

  try {
    await navigator.share(richPayload);

    return {
      status: 'shared',
      diagnostics,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return {
        status: 'cancelled',
        diagnostics,
      };
    }

    logShareError(error);

    if (error?.name === 'TypeError' || error?.name === 'DataError') {
      try {
        await navigator.share(fileOnlyPayload);

        return {
          status: 'shared',
          retriedWithFileOnly: true,
          diagnostics,
        };
      } catch (retryError) {
        if (retryError?.name === 'AbortError') {
          return {
            status: 'cancelled',
            diagnostics,
          };
        }

        logShareError(retryError);

        return {
          status: 'failed',
          reason: retryError?.name || 'share-retry-failed',
          error: retryError,
          diagnostics,
        };
      }
    }

    return {
      status: 'failed',
      reason: error?.name || 'share-failed',
      error,
      diagnostics,
    };
  }
}
