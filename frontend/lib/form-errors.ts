// BFF から返ってきた Laravel のエラー（422 の { message, errors }）をフォームに出す（docs/08 §3.5）。
// R4: R3 は「errors の各項目を setError に割り当てる」ループを 5 つのフォームに同じように書いていた。

import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

type LaravelErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
};

/**
 * Laravel の errors を各フィールドの下に割り当てる。
 * 割り当てられるものが無ければ message を返す（フォームの下にまとめて出す用）。
 */
export function applyLaravelErrors<T extends FieldValues>(
  body: LaravelErrorBody | null,
  setError: UseFormSetError<T>,
  fallback: string,
): string | null {
  if (body?.errors && Object.keys(body.errors).length > 0) {
    for (const [field, messages] of Object.entries(body.errors)) {
      setError(field as Path<T>, { message: messages[0] });
    }
    return null;
  }

  return body?.message ?? fallback;
}
