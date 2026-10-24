<?php

return [
    /*
     | Month (1-12) in which a new school year starts. Default: June (school year 2026-2027 starts June 2026).
     | Change with SCHOOL_YEAR_START_MONTH in .env.
     */
    'school_year_start_month' => (int) env('SCHOOL_YEAR_START_MONTH', 6),

    /* First school year (start year) in which students are asked the yearly year-level question. */
    'year_level_prompt_from' => (int) env('YEAR_LEVEL_PROMPT_FROM', 2026),

    /* Year levels in order; a student on the last one is not asked anything. */
    'year_levels' => ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'],
];
