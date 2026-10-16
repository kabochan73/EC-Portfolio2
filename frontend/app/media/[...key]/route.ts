// 商品・CMS 画像の配信プロキシ（docs/05-admin.md）。
// Railway Storage Bucket（本番）/ RustFS（ローカル）は private のみで直リンクできないため、
// このサーバー側 Route Handler が S3 互換バケットから GetObject して中継する。
// next/image はデフォルトの loader のまま（同一オリジンの /media/... を最適化）。
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

// 配信してよいキーの先頭（R4）。バケットに将来、非公開のファイルを置いても外から読めないように、
// 商品画像（products/）と CMS 画像（content/）だけに限る。R3 はどのキーでも読めた
const ALLOWED_PREFIXES = ["products/", "content/"];

const s3 = new S3Client({
  endpoint: process.env.BUCKET_ENDPOINT,
  region: process.env.BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.BUCKET_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY ?? "",
  },
  // RustFS（ローカル）はパス形式。Railway Storage（本番）はバーチャルホスト形式。
  // backend の AWS_USE_PATH_STYLE_ENDPOINT と同じ判断。既定はローカル向けに true。
  forcePathStyle: process.env.BUCKET_FORCE_PATH_STYLE !== "false",
});

type Params = { params: Promise<{ key: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const { key } = await params;
  const objectKey = key.join("/");

  if (!ALLOWED_PREFIXES.some((prefix) => objectKey.startsWith(prefix)) || key.includes("..")) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const object = await s3.send(
      new GetObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: objectKey }),
    );

    if (!object.Body) {
      return new NextResponse(null, { status: 404 });
    }

    const bytes = await object.Body.transformToByteArray();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        // キーに毎回違う ULID が入るので中身は変わらない → 1 年キャッシュしてよい
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // NoSuchKey 等はまとめて 404（バケット未設定時の内部エラー詳細を漏らさない）
    return new NextResponse(null, { status: 404 });
  }
}
