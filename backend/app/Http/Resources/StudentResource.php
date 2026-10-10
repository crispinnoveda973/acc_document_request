<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** A student as shown in the admin "Students" list (includes the profile picture). */
class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->user?->name,
            'email' => $this->user?->email,
            'avatar_url' => $this->user?->avatar_url,
            'is_active' => (bool) $this->user?->is_active,
            'student_number' => $this->student_number,
            'course' => $this->course,
            'year_level' => $this->year_level,
            'contact_number' => $this->contact_number,
            'requests_count' => $this->requests_count ?? 0,
        ];
    }
}
