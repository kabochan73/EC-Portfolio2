/** index の要素を direction（-1 = 前 / 1 = 後ろ）へ 1 つ動かした新しい配列を返す。端なら元の配列のまま */
export function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
