<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StatusHistory extends Model
{
    protected $table = 'request_status_histories';
    protected $fillable = ['document_request_id', 'old_status', 'new_status', 'remarks', 'changed_by'];

    public function changer() { return $this->belongsTo(User::class, 'changed_by'); }
}
