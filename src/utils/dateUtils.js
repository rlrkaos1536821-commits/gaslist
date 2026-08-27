const pad = (value) => String(value).padStart(2, '0');

export function formatDateForExcel(dateValue) {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export function getTodayFileStamp(date = new Date()) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

export function formatDateForDisplay(dateValue, options = {}) {
  if (!dateValue) return '';

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  const dateText = `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
  if (!options.includeTime) return dateText;

  return `${dateText} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
