<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
            'year_level' => ['required', 'string', 'max:20'],
            'contact_number' => ['required', 'string', 'regex:/^[0-9+\-\s]{7,20}$/'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
}
