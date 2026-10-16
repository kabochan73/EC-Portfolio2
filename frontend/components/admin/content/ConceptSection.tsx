"use client";

import { useState } from "react";

import ContentSaveBar from "@/components/admin/content/ContentSaveBar";
import { useContentSave } from "@/lib/hooks/useContentSave";
import { conceptSchema } from "@/lib/schemas/adminContent";
import type { SiteContent } from "@/lib/types";

/** トップの Concept（本文。改行はそのままトップに出る） */
export default function ConceptSection({ initial }: { initial: SiteContent["concept"] }) {
  const [body, setBody] = useState(initial.body);
  const { save, ...status } = useContentSave("concept", conceptSchema);

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="concept-body" className="block text-[11px] tracking-widest text-graphite uppercase">
          Body
        </label>
        <textarea
          id="concept-body"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-2 w-full border border-ink bg-transparent p-2 text-sm outline-none"
        />
      </div>
      <ContentSaveBar label="Save Concept" {...status} onSave={() => save({ body })} />
    </div>
  );
}
