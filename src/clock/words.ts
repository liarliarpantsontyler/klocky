const small = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
export function numberWords(value: number): string {
  if (value < 20) return small[value];
  return (
    ["", "", "twenty", "thirty", "forty", "fifty"][Math.floor(value / 10)] +
    (value % 10 ? ` ${small[value % 10]}` : "")
  );
}
export function clockWords(hour: number, minute: number): string {
  return `${numberWords(hour)}\n${minute === 0 ? "o’clock" : minute < 10 ? `oh ${numberWords(minute)}` : numberWords(minute)}`;
}
