import { z } from "zod";

// backend/app/Http/Requests/Admin/Content/UpdateSiteContentRequest.php の key ごとのルールと揃える。

export const heroSchema = z.object({
  headline: z.string().min(1, "見出しを入力してください").max(120),
  tagline: z.string().min(1, "タグラインを入力してください").max(200),
  image_url: z.string().max(255).nullable(),
});

export const conceptSchema = z.object({
  body: z.string().min(1, "本文を入力してください").max(2000),
});

export const lookbookSchema = z.object({
  images: z
    .array(z.object({ url: z.string().min(1).max(255), alt: z.string().max(255) }))
    .max(12, "画像は 12 枚までです"),
});

export const aboutSchema = z.object({
  blocks: z
    .array(
      z.object({
        label: z.string().min(1, "ラベルを入力してください").max(60),
        heading: z.string().min(1, "見出しを入力してください").max(120),
        body: z.string().min(1, "本文を入力してください").max(800),
        image_url: z.string().max(255).nullable(),
      }),
    )
    .max(6, "ブロックは 6 個までです"),
});
