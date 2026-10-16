import { z } from "zod";

import { newPasswordFields, passwordsMatch } from "@/lib/schemas/new-password";

// backend/app/Http/Requests/Auth/ResetPasswordRequest.php と揃える。token / email は URL から来るのでフォームの外。
export const resetPasswordSchema = z.object(newPasswordFields).refine(passwordsMatch.check, passwordsMatch.options);

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
