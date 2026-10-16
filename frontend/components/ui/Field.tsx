import { forwardRef, type InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** react-hook-form の errors.xxx?.message をそのまま渡す */
  error?: string;
};

/**
 * ラベル + 下線だけの入力 + エラーメッセージ。全フォーム共通の1フィールド。
 *   <Field label="Email" id="email" type="email" error={errors.email?.message} {...register("email")} />
 */
const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, id, className, ...rest },
  ref,
) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] tracking-widest text-graphite uppercase">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        className={`mt-2 w-full border-b border-ink bg-transparent py-2 text-sm outline-none ${className ?? ""}`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-graphite">{error}</p>}
    </div>
  );
});

export default Field;
