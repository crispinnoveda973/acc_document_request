<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StudentResource;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;

/** Admin-only: browse all students together with their profile pictures. */
class StudentController extends Controller
{
    public function index(Request $r)
    {
        $q = Student::with('user')->withCount('requests');

        if ($s = trim((string) $r->search)) {
            $q->where(function ($w) use ($s) {
                $w->where('student_number', 'like', "%$s%")
                  ->orWhere('course', 'like', "%$s%")
                  ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%"));
            });
        }

        // Alphabetical by the student's name (which lives on the users table).
        $q->orderBy(User::select('name')->whereColumn('users.id', 'students.user_id'));

        return StudentResource::collection($q->paginate(12)->withQueryString());
    }
}
