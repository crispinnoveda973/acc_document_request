<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NoticeController extends Controller
{
    public function index(Request $r)
    {
        $q = $r->user()->notices();
        return response()->json([
            'unread' => (clone $q)->whereNull('read_at')->count(),
            'data' => $q->latest()->take(15)->get(['id', 'document_request_id', 'message', 'read_at', 'created_at']),
        ]);
    }

    public function markAllRead(Request $r)
    {
        $r->user()->notices()->whereNull('read_at')->update(['read_at' => now()]);
        return response()->json(['message' => 'ok']);
    }
}
