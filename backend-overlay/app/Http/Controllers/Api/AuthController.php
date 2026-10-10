<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $r)
    {
        $d = $r->validated();
        $user = DB::transaction(function () use ($d) {
            $user = User::create([
                'name' => strip_tags($d['name']), 'email' => $d['email'],
                'password' => $d['password'], 'role' => 'student',
            ]);
            Student::create([
                'user_id' => $user->id, 'student_number' => $d['student_number'],
                'course' => strip_tags($d['course']), 'year_level' => $d['year_level'],
                'contact_number' => $d['contact_number'],
            ]);
            return $user;
        });

        return response()->json(['user' => $user->payload(), 'token' => $user->createToken('acc')->plainTextToken], 201);
    }

    public function login(Request $r)
    {
        $d = $r->validate(['login' => ['required', 'string'], 'password' => ['required', 'string']]);

        $user = User::where('email', $d['login'])
            ->orWhereHas('student', fn ($q) => $q->where('student_number', $d['login']))
            ->first();

        if (! $user || ! Hash::check($d['password'], $user->password)) {
            throw ValidationException::withMessages(['login' => 'Invalid credentials.']);
        }
        if (! $user->is_active) {
            throw ValidationException::withMessages(['login' => 'This account has been deactivated.']);
        }

        return response()->json(['user' => $user->payload(), 'token' => $user->createToken('acc')->plainTextToken]);
    }

    public function logout(Request $r)
    {
        $r->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $r)
    {
        return response()->json(['user' => $r->user()->payload()]);
    }

    public function updateProfile(Request $r)
    {
        $user = $r->user();
        $d = $r->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users')->ignore($user->id)],
            'course' => ['sometimes', 'string', 'max:150'],
            'year_level' => ['sometimes', 'string', 'max:20'],
            'contact_number' => ['sometimes', 'string', 'regex:/^[0-9+\-\s]{7,20}$/'],
        ]);

        $user->update(['name' => strip_tags($d['name']), 'email' => $d['email']]);
        if ($user->student) {
            $user->student->update(collect($d)->only(['course', 'year_level', 'contact_number'])->all());
        }
        return response()->json(['user' => $user->fresh()->payload()]);
    }

    /** Upload or replace the logged-in user's profile picture (students and admins). */
    public function updatePhoto(Request $r)
    {
        $r->validate(
            ['photo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048']],
            ['photo.mimes' => 'The photo must be a JPG, PNG or WebP image.', 'photo.max' => 'The photo must not be larger than 2 MB.']
        );

        $user = $r->user();
        $old = $user->profile_photo_path;
        $user->update(['profile_photo_path' => $r->file('photo')->store('avatars', 'public')]);

        // Remove the previous file only after the new one is saved, so a failed upload never leaves the user without a photo.
        if ($old) Storage::disk('public')->delete($old);

        return response()->json(['user' => $user->fresh()->payload()]);
    }

    public function deletePhoto(Request $r)
    {
        $user = $r->user();
        if ($user->profile_photo_path) {
            Storage::disk('public')->delete($user->profile_photo_path);
            $user->update(['profile_photo_path' => null]);
        }
        return response()->json(['user' => $user->fresh()->payload()]);
    }

    public function changePassword(Request $r)
    {
        $d = $r->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);
        $r->user()->update(['password' => $d['password']]);
        return response()->json(['message' => 'Password updated.']);
    }
}
