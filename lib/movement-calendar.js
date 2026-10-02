export function monthIndex(date) {
  return date.getFullYear() * 12 + date.getMonth();
}

export function shiftMonth(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + Number(delta || 0), 1);
}

export function canGoPrevious(viewDate, firstLogDate) {
  return monthIndex(viewDate) > monthIndex(firstLogDate);
}

export function canGoNext(viewDate, currentDate) {
  return monthIndex(viewDate) < monthIndex(currentDate);
}
