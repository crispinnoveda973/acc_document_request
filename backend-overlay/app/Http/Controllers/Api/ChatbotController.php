<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Chatbot;
use Illuminate\Http\Request;

/**
 * ACC Assistant (chatbot). Any logged-in user (student or admin) may ask; the answer depends on the role:
 * a student only ever gets information about their own requests, an admin can look up any request.
 * The logic lives in App\Support\Chatbot; this controller only validates the question.
 */
class ChatbotController extends Controller
{
    public function ask(Request $r)
    {
        // SanitizeInput has already stripped HTML; here we only check that something was typed and limit its length.
        $d = $r->validate(['message' => ['required', 'string', 'max:'.Chatbot::MAX_LENGTH]]);

        return response()->json(['data' => Chatbot::reply($d['message'], $r->user())]);
    }
}
