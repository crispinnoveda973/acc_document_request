<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notice extends Model
{
    protected $fillable = ['user_id', 'document_request_id', 'message', 'read_at'];
    protected $casts = ['read_at' => 'datetime'];
}
