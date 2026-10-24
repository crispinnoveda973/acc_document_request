<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StudentResource;
use App\Models\Student;
use App\Models\User;
use App\Support\Search;
use Illuminate\Http\Request;

/** Admin-only: browse all students together with their profile pictures. */
class StudentController extends Controller
{
    public function index(Request $r)
    {
        $q = Student::with('user')->withCount('requests');

        $r->validate(['search' => ['nullable', 'string', 'max:100']]);
        if ($s = trim((string) $r->search)) {
            $like = Search::like($s);   // bound parameter + escaped wildcards
            $q->where(function ($w) use ($like) {
                $w->where('student_number', 'like', $like)
                  ->orWhere('course', 'like', $like)
                  ->orWhereHas('user', fn ($u) => $u->where('name', 'like', $like)->orWhere('email', 'like', $like));
            });
        }

        // Alphabetical by the student's name (which lives on the users table).
        $q->orderBy(User::select('name')->whereColumn('users.id', 'students.user_id'));

        return StudentResource::collection($q->paginate(12)->withQueryString());
    }
}
