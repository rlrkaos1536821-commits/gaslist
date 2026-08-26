import { XLSX_MIME } from '../services/excelService.js';

export function createShareFile(blob, fileName) {
  return new File([blob], fileName, {
    type: XLSX_MIME,
  });
}

export function canShareFile(file) {
  try {
    return Boolean(
      typeof navigator !== 'undefined'
        && navigator.share
        && navigator.canShare
        && navigator.canShare({ files: [file] }),
    );
  } catch (error) {
    console.error('Failed to check file sharing support.', error);
    return false;
  }
}

function canSharePayload(payload) {
  try {
    if (typeof navigator === 'undefined' || !navigator.share) return false;
    if (!navigator.canShare) return true;
    return navigator.canShare(payload);
  } catch (error) {
    console.error('Failed to check sharing support.', error);
    return false;
  }
}

export async function shareEvaluationExcel({
  blob,
  fileName,
  projectInfo,
  totalScore,
}) {
  if (typeof File === 'undefined') {
    return {
      shared: false,
      reason: 'unsupported',
    };
  }

  const file = createShareFile(blob, fileName);
  const richPayload = {
    files: [file],
    title: `[시공평가] ${projectInfo.projectName}`,
    text:
      `${projectInfo.projectName} 시공평가 결과입니다.\n`
      + `공사번호: ${projectInfo.projectNumber}\n`
      + `평가점수: ${totalScore}점`,
  };
  const fileOnlyPayload = {
    files: [file],
  };

  const payloads = [fileOnlyPayload, richPayload].filter(canSharePayload);

  if (payloads.length === 0) {
    return {
      shared: false,
      reason: 'unsupported',
      file,
    };
  }

  let lastError;

  try {
    for (const payload of payloads) {
      try {
        await navigator.share(payload);

        return {
          shared: true,
          file,
        };
      } catch (error) {
        if (error?.name === 'AbortError') {
          return {
            shared: false,
            cancelled: true,
            file,
          };
        }

        lastError = error;
      }
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return {
        shared: false,
        cancelled: true,
        file,
      };
    }

    throw error;
  }

  console.error('Failed to share evaluation file.', lastError);

  return {
    shared: false,
    reason: 'failed',
    file,
    error: lastError,
  };
}
