<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'student_number' => ['required', 'string', 'max:30', 'unique:students,student_number'],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'course' => ['required', 'string', 'max:150'],
            'year_level' => ['required', Rule::in(config('acc.year_levels'))],
            'contact_number' => ['required', 'string', 'regex:/^[0-9+\-\s]{7,20}$/'],
            'password' => ['required', 'string', Password::min(8)->letters()->numbers(), 'confirmed'],
        ];
    }
}
