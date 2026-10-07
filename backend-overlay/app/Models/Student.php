<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    protected $fillable = ['user_id', 'student_number', 'course', 'year_level', 'contact_number'];

    public function user() { return $this->belongsTo(User::class); }
    public function requests() { return $this->hasMany(DocumentRequest::class); }
}
