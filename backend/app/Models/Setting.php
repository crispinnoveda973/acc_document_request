<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /** Keys the admin can edit as plain text. */
    public const TEXT_KEYS = [
        'about_text', 'address', 'contact_email', 'contact_phone', 'office_hours',
        'claim_steps', 'payment_notes',
        'gcash_name', 'gcash_number', 'bank_name', 'bank_account_name', 'bank_account_number',
    ];

    /** Safe to show on the public login page. */
    public const PUBLIC_KEYS = ['about_text', 'address', 'contact_email', 'contact_phone', 'office_hours'];

    public static function allKeyed(): array
    {
        return static::pluck('value', 'key')->all();
    }

    public static function put(string $key, ?string $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }

    public static function files(): array
    {
        return json_decode(static::where('key', 'claim_files')->value('value') ?: '[]', true) ?: [];
    }
}
