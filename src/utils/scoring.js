export function isAnswered(answer) {
  return answer !== undefined && answer !== null && answer !== '';
}

export function getItemScore(item, answer) {
  if (!isAnswered(answer)) return 0;

  if (item.inputType === 'number') {
    return item.calculateScore(answer);
  }

  const selectedOption = item.options.find((option) => option.label === answer);
  return selectedOption?.score ?? 0;
}

export function getUnevaluatedItems(items, answers) {
  return items.filter((item) => !isAnswered(answers[item.id]));
}
