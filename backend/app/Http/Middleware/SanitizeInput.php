<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cross-site scripting (XSS) protection, layer 1: clean every incoming text value ONCE, for every API route.
 *
 *  - HTML/script tags are removed (<script>, <img onerror=...>, <svg onload=...> ...), so markup is never stored.
 *  - NULL bytes and control characters are removed; surrounding spaces are trimmed.
 *  - Passwords are left untouched (they are hashed, never displayed, and must not be altered).
 *
 * Layer 2 is output encoding: React escapes everything it renders and the app never uses dangerouslySetInnerHTML.
 * Layer 3 is the Content-Security-Policy header (see SecurityHeaders and frontend/vite.config.js).
 */
class SanitizeInput
{
    private const SKIP = ['password', 'password_confirmation', 'current_password'];

    public function handle(Request $request, Closure $next): Response
    {
        $request->merge($this->clean($request->input()));
        return $next($request);
    }

    private function clean(mixed $value, string $key = ''): mixed
    {
        if (is_array($value)) {
            foreach ($value as $k => $v) $value[$k] = $this->clean($v, (string) $k);
            return $value;
        }
        if (! is_string($value) || in_array($key, self::SKIP, true)) return $value;

        $value = str_replace("\0", '', $value);
        // Control characters except tab / new line / carriage return. (If the text is not valid UTF-8 keep it as is; validation rejects it later.)
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? $value;
        return trim(strip_tags($value));
    }
}
