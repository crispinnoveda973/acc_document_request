<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    protected $fillable = ['user_id', 'student_number', 'course', 'year_level', 'year_level_checked_sy', 'contact_number'];

    public function user() { return $this->belongsTo(User::class); }
    public function requests() { return $this->hasMany(DocumentRequest::class); }

    /** Current school year as "2026-2027" (a new school year starts in config('acc.school_year_start_month')). */
    public static function currentSchoolYear(?\Carbon\CarbonInterface $now = null): string
    {
        $now ??= now();
        $start = $now->month >= config('acc.school_year_start_month') ? $now->year : $now->year - 1;
        return $start.'-'.($start + 1);
    }

    /** The year level after the student's current one, or null (last level / unknown value). */
    public function nextYearLevel(): ?string
    {
        $levels = config('acc.year_levels');
        $i = array_search($this->year_level, $levels, true);
        return $i === false ? null : ($levels[$i + 1] ?? null);
    }

    /**
     * The yearly question, or null when nothing needs to be asked:
     * only from school year 2026-2027 on, once per school year, and only if there is a next year level.
     */
    public function yearLevelPrompt(): ?array
    {
        $sy = static::currentSchoolYear();
        if ((int) substr($sy, 0, 4) < config('acc.year_level_prompt_from')) return null;
        if ($this->year_level_checked_sy === $sy) return null;
        $next = $this->nextYearLevel();
        if (! $next) return null;

        return [
            'school_year' => $sy,
            'current_year_level' => $this->year_level,
            'next_year_level' => $next,
            'question' => 'Are you now a '.strtolower($next).' level?',
        ];
    }
}
