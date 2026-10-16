// Laravel の JSON Resource の包み方（backend/app/Http/Resources/*）。

/** 単体リソース { "data": {...} } */
export type ApiResource<T> = { data: T };

/** 一覧リソース { "data": [...] } */
export type ApiCollection<T> = { data: T[] };
