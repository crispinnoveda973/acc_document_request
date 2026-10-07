<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentType extends Model
{
    protected $fillable = ['name', 'description', 'fee', 'processing_days', 'is_active'];
    protected $casts = ['is_active' => 'boolean', 'fee' => 'decimal:2'];

    public function requests() { return $this->hasMany(DocumentRequest::class); }
}
