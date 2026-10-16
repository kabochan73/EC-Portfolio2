// トップページの CMS（GET /api/content。docs/11-cms.md、backend の SiteContent::defaults と同じ形）。

export type SiteContent = {
  hero: { headline: string; tagline: string; image_url: string | null };
  concept: { body: string };
  lookbook: { images: { url: string; alt: string }[] };
  about: {
    blocks: { label: string; heading: string; body: string; image_url: string | null }[];
  };
};
