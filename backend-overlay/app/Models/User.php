<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'role', 'is_active'];
    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['email_verified_at' => 'datetime', 'password' => 'hashed', 'is_active' => 'boolean'];
    }

    public function student() { return $this->hasOne(Student::class); }
    public function notices() { return $this->hasMany(Notice::class); }

    public function payload(): array
    {
        $this->loadMissing('student');
        $s = $this->student;
        return [
            'id' => $this->id, 'name' => $this->name, 'email' => $this->email, 'role' => $this->role,
            'student' => $s ? [
                'id' => $s->id, 'student_number' => $s->student_number, 'course' => $s->course,
                'year_level' => $s->year_level, 'contact_number' => $s->contact_number,
            ] : null,
        ];
    }
}
