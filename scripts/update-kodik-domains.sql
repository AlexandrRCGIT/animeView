-- ============================================================
-- Обновление доменов Kodik в существующей БД
-- Новые домены:
--   База:   https://bd.kodikres.com
--   Плеер:  https://kodikplayer.com
--   Соц.:   https://kodikonline.com
--   API:    https://kodik-api.com
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_kodik_domain(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(
                            replace(
                              replace(
                                replace(
                                  replace(
                                    replace(
                                      replace(input, '://www.kodik.info', '://kodikplayer.com'),
                                      '://kodik.info', '://kodikplayer.com'
                                    ),
                                    '//www.kodik.info', '//kodikplayer.com'
                                  ),
                                  '//kodik.info', '//kodikplayer.com'
                                ),
                                '://www.kodik.biz', '://kodikplayer.com'
                              ),
                              '://kodik.biz', '://kodikplayer.com'
                            ),
                            '//www.kodik.biz', '//kodikplayer.com'
                          ),
                          '//kodik.biz', '//kodikplayer.com'
                        ),
                        '://www.kodik.cc', '://kodikplayer.com'
                      ),
                      '://kodik.cc', '://kodikplayer.com'
                    ),
                    '//www.kodik.cc', '//kodikplayer.com'
                  ),
                  '//kodik.cc', '//kodikplayer.com'
                ),
                '://www.kodikapi.com', '://kodik-api.com'
              ),
              '://kodikapi.com', '://kodik-api.com'
            ),
            '//www.kodikapi.com', '//kodik-api.com'
          ),
          '//kodikapi.com', '//kodik-api.com'
        ),
        '://www.kodik-api.com', '://kodik-api.com'
      ),
      '//www.kodik-api.com', '//kodik-api.com'
    );
$$;

-- 1) Главная ссылка перевода
UPDATE public.anime_translations
SET link = public.normalize_kodik_domain(link)
WHERE link ~* 'kodik\\.(info|biz|cc)|kodikapi\\.com';

-- 2) Сезоны и эпизоды (JSONB с URL внутри)
UPDATE public.anime_translations
SET seasons = public.normalize_kodik_domain(seasons::text)::jsonb
WHERE seasons IS NOT NULL
  AND seasons::text ~* 'kodik\\.(info|biz|cc)|kodikapi\\.com';

-- 3) episodes_info в таблице anime (там тоже есть link внутри JSONB)
UPDATE public.anime
SET episodes_info = public.normalize_kodik_domain(episodes_info::text)::jsonb
WHERE episodes_info IS NOT NULL
  AND episodes_info::text ~* 'kodik\\.(info|biz|cc)|kodikapi\\.com';

-- 4) material_data может содержать legacy-ссылки
UPDATE public.anime
SET material_data = public.normalize_kodik_domain(material_data::text)::jsonb
WHERE material_data IS NOT NULL
  AND material_data::text ~* 'kodik\\.(info|biz|cc)|kodikapi\\.com';

COMMIT;
