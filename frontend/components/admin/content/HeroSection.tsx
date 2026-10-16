"use client";

import { useState } from "react";

import ContentImageUpload from "@/components/admin/content/ContentImageUpload";
import ContentSaveBar from "@/components/admin/content/ContentSaveBar";
import Field from "@/components/ui/Field";
import { useContentSave } from "@/lib/hooks/useContentSave";
import { heroSchema } from "@/lib/schemas/adminContent";
import type { SiteContent } from "@/lib/types";

/** トップの Hero（見出し・タグライン・背景画像） */
export default function HeroSection({ initial }: { initial: SiteContent["hero"] }) {
  const [headline, setHeadline] = useState(initial.headline);
  const [tagline, setTagline] = useState(initial.tagline);
  const [imageUrl, setImageUrl] = useState(initial.image_url);
  const { save, ...status } = useContentSave("hero", heroSchema);

  return (
    <div className="space-y-5">
      <Field label="Headline" id="hero-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
      <Field label="Tagline" id="hero-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
      <ContentImageUpload contentKey="hero" value={imageUrl} onChange={setImageUrl} label="Background Image（任意）" />
      <ContentSaveBar label="Save Hero" {...status} onSave={() => save({ headline, tagline, image_url: imageUrl })} />
    </div>
  );
}
