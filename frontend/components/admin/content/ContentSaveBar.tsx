type Props = {
  label: string;
  saving: boolean;
  error: string | null;
  notice: string | null;
  onSave: () => void;
};

/** CMS の各セクションの下の「エラー / 保存しました + Save ボタン」（useContentSave の結果を出すだけ） */
export default function ContentSaveBar({ label, saving, error, notice, onSave }: Props) {
  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-graphite">{error}</p>}
      {notice && <p className="text-xs text-graphite">{notice}</p>}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="bg-ink px-6 py-3 text-xs tracking-widest text-paper uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {saving ? "..." : label}
      </button>
    </div>
  );
}
