// (cart) 配下（/cart・/checkout）を開くまでのスケルトン。
// ここは notFound() を呼ばないので、loading.tsx を置いても 404 が 200 になる問題は起きない（Step 34 の理由。docs/08 §11）
export default function CartLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-6 py-12">
      <div className="mb-8 h-8 w-32 bg-mist" />
      <div className="grid gap-12 md:grid-cols-[1fr_20rem]">
        <div className="space-y-6 border-t border-ink pt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="aspect-3/4 w-20 flex-none bg-mist" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 bg-mist" />
                <div className="h-3 w-24 bg-mist" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-64 bg-mist" />
      </div>
    </div>
  );
}
