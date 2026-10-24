<?php

namespace App\Support;

/**
 * Helpers for building safe search patterns.
 *
 * SQL injection is already prevented because every query uses Eloquent / bound parameters (the user's text is sent
 * to MySQL as DATA, never glued into the SQL string). This helper closes the last small gap: the LIKE wildcards
 * "%" and "_" typed by a user would otherwise act as wildcards ("%" would match every row).
 */
class Search
{
    /** "50%_off" -> "%50\%\_off%"  (contains-match with the user's wildcards escaped). MySQL's default LIKE escape is "\". */
    public static function like(string $term): string
    {
        return '%'.addcslashes(mb_substr(trim($term), 0, 100), '\\%_').'%';
    }
}
