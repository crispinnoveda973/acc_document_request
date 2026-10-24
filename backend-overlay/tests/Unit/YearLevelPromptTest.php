<?php

namespace Tests\Unit;

use App\Models\Student;
use Carbon\Carbon;
use Tests\TestCase;

/** The yearly "Are you now a ... year level?" question: when it is asked and which level it names. */
class YearLevelPromptTest extends TestCase
{
    protected function tearDown(): void
    {
        $this->travelBack();
        parent::tearDown();
    }

    private function student(string $level, ?string $checkedSy = null): Student
    {
        return new Student(['year_level' => $level, 'year_level_checked_sy' => $checkedSy]);
    }

    public function test_school_year_starts_in_june(): void
    {
        $this->travelTo(Carbon::parse('2026-05-31'));
        $this->assertSame('2025-2026', Student::currentSchoolYear());
        $this->travelTo(Carbon::parse('2026-06-01'));
        $this->assertSame('2026-2027', Student::currentSchoolYear());
    }

    public function test_2026_2027_asks_about_the_next_level(): void
    {
        $this->travelTo(Carbon::parse('2026-10-20'));
        $p = $this->student('2nd Year')->yearLevelPrompt();
        $this->assertSame('Are you now a 3rd year level?', $p['question']);
        $this->assertSame('2026-2027', $p['school_year']);
    }

    public function test_2027_2028_asks_about_the_following_level(): void
    {
        $this->travelTo(Carbon::parse('2027-10-20'));
        $p = $this->student('3rd Year', '2026-2027')->yearLevelPrompt();
        $this->assertSame('Are you now a 4th year level?', $p['question']);
    }

    public function test_not_asked_twice_in_the_same_school_year(): void
    {
        $this->travelTo(Carbon::parse('2026-10-20'));
        $this->assertNull($this->student('2nd Year', '2026-2027')->yearLevelPrompt());
    }

    public function test_not_asked_before_school_year_2026_2027(): void
    {
        $this->travelTo(Carbon::parse('2026-01-15'));   // still school year 2025-2026
        $this->assertNull($this->student('2nd Year')->yearLevelPrompt());
    }

    public function test_last_level_is_never_asked(): void
    {
        $this->travelTo(Carbon::parse('2026-10-20'));
        $this->assertNull($this->student('5th Year')->yearLevelPrompt());
    }
}
