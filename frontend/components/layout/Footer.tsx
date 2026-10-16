// ダミーの連絡先。ドメインは IANA 予約の example.jp なので実在しない（誤送信の心配なし）。
const PHONE = "03-1234-5678";
const EMAIL = "contact@ec-portfolio.example.jp";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-16">
        <p className="text-sm tracking-[0.2em] uppercase">EC-PORTFOLIO</p>
        <div className="text-xs tracking-widest text-graphite uppercase">
          <a href={`tel:${PHONE}`} className="block transition-opacity hover:opacity-60">
            Tel {PHONE}
          </a>
          <a
            href={`mailto:${EMAIL}`}
            className="block lowercase transition-opacity hover:opacity-60"
          >
            {EMAIL}
          </a>
        </div>
      </div>

      <div className="border-t border-ink px-6 py-6 text-center text-[11px] tracking-widest text-graphite uppercase">
        © 2026 EC-PORTFOLIO. All rights reserved.
      </div>
    </footer>
  );
}
