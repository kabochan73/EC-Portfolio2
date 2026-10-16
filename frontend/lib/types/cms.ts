// トップページの CMS（GET /api/content。docs/11-cms.md、backend の SiteContent::defaults と同じ形）。

export type SiteContent = {
  hero: { headline: string; tagline: string; image_url: string | null };
  concept: { body: string };
  lookbook: { images: { url: string; alt: string }[] };
  about: {
    blocks: { label: string; heading: string; body: string; image_url: string | null }[];
  };
};

/** CMS のキー（hero / concept / lookbook / about）。管理画面の保存・画像アップロードの URL に使う */
export type ContentKey = keyof SiteContent;
