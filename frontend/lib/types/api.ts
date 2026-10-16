// Laravel の JSON Resource の包み方（backend/app/Http/Resources/*）。

/** 単体リソース { "data": {...} } */
export type ApiResource<T> = { data: T };

/** 一覧リソース { "data": [...] } */
export type ApiCollection<T> = { data: T[] };

/** ページ付きの一覧（Laravel の paginate + Resource collection。links は使わないので型に入れない） */
export type ApiPaginated<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};
