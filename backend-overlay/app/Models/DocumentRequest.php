<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DocumentRequest extends Model
{
    use SoftDeletes;

    public const READY = 'Ready to pick up';
    public const STATUSES = ['Pending', 'Under Review', 'Approved', 'Processing', self::READY, 'Completed', 'Rejected', 'Cancelled'];
    public const FINAL = ['Completed', 'Rejected', 'Cancelled'];
    public const PAYMENT_METHODS = ['GCash', 'Bank Transfer', 'Cash'];
    /** Methods the student pays online and the admin must check (reference no. / receipt). Cash is recorded by the admin at the office. */
    public const ONLINE_METHODS = ['GCash', 'Bank Transfer'];
    public const PAYMENT_STATUSES = ['Unpaid', 'Pending Verification', 'Verified', 'Rejected'];
    /** The document cannot be released (ready / completed) until a paid request has a verified payment. */
    public const NEEDS_VERIFIED_PAYMENT = [self::READY, 'Completed'];

    protected $fillable = [
        'reference_number', 'transaction_number', 'student_id', 'document_type_id', 'copies', 'purpose',
        'preferred_claim_date', 'status', 'pickup_date', 'attachment_path', 'rejection_reason',
        'amount', 'payment_method', 'payment_reference', 'payment_proof_path', 'payment_status',
        'payment_submitted_at', 'payment_verified_at', 'payment_verified_by', 'payment_remarks',
        'pickup_by', 'representative_name', 'authorization_letter_path', 'processed_by',
    ];
    protected $casts = [
        'preferred_claim_date' => 'date', 'pickup_date' => 'date', 'amount' => 'decimal:2',
        'payment_submitted_at' => 'datetime', 'payment_verified_at' => 'datetime',
    ];

    public function student() { return $this->belongsTo(Student::class); }
    public function documentType() { return $this->belongsTo(DocumentType::class); }
    public function processor() { return $this->belongsTo(User::class, 'processed_by'); }
    public function paymentVerifier() { return $this->belongsTo(User::class, 'payment_verified_by'); }
    public function histories() { return $this->hasMany(StatusHistory::class)->orderBy('id'); }

    /** Strip spaces/dashes and upper-case a payment reference so "1234 5678-90" and "1234567890" count as the same. */
    public static function normalizeReference(?string $ref): ?string
    {
        $ref = strtoupper(preg_replace('/[\s\-]+/', '', strip_tags((string) $ref)));
        return $ref === '' ? null : $ref;
    }

    /**
     * Validation rules for a payment reference number (already normalized).
     *  - GCash:         10-20 digits (the "Ref. No." shown in the GCash receipt)
     *  - Bank Transfer: 6-40 letters/digits (InstaPay / PESONet / deposit-slip reference)
     * The same reference cannot be used on two different requests (stops one receipt being reused).
     */
    public static function referenceRules(?string $method, ?int $ignoreRequestId = null): array
    {
        return [
            'nullable', 'string', 'max:80',
            'regex:'.($method === 'GCash' ? '/^[0-9]{10,20}$/' : '/^[A-Z0-9]{6,40}$/'),
            Rule::unique('document_requests', 'payment_reference')->ignore($ignoreRequestId),
        ];
    }

    public static function referenceMessages(): array
    {
        return [
            'payment_reference.regex' => 'Invalid reference number. GCash: 10-20 digits. Bank transfer: 6-40 letters/numbers (no symbols).',
            'payment_reference.unique' => 'This reference number was already used on another request. Please check it and try again.',
            'payment_reference.required_without' => 'Enter your payment reference number or upload your receipt.',
        ];
    }

    public static function nextReference(): string
    {
        $year = now()->year;
        $last = static::withTrashed()->where('reference_number', 'like', "ACC-$year-%")->max('reference_number');
        $n = $last ? ((int) substr($last, -5)) + 1 : 1;
        return sprintf('ACC-%d-%05d', $year, $n);
    }

    /** Unique transaction number shown to the student, e.g. TXN-20261007-K7Q2ZP */
    public static function nextTransaction(): string
    {
        do {
            $n = 'TXN-'.now()->format('Ymd').'-'.strtoupper(Str::random(6));
        } while (static::withTrashed()->where('transaction_number', $n)->exists());
        return $n;
    }

    /** Send an in-app notification to every active admin. */
    public function notifyAdmins(string $message): void
    {
        User::where('role', 'admin')->where('is_active', true)->get()->each(
            fn (User $a) => $a->notices()->create(['document_request_id' => $this->id, 'message' => $message])
        );
    }

    public function notifyStudent(string $message): void
    {
        $this->student?->user?->notices()->create(['document_request_id' => $this->id, 'message' => $message]);
    }

    /**
     * Change status, log history and notify.
     * $byAdmin = true  -> the student is notified.
     * $byAdmin = false -> the student did it (e.g. cancel) and the admins are notified instead.
     */
    public function changeStatus(string $new, ?string $remarks, int $by, bool $byAdmin = true): void
    {
        DB::transaction(function () use ($new, $remarks, $by, $byAdmin) {
            $old = $this->status;
            $this->status = $new;
            if ($byAdmin) $this->processed_by = $by;
            if ($new === 'Rejected') $this->rejection_reason = $remarks;
            $this->save();

            $this->histories()->create([
                'old_status' => $old, 'new_status' => $new, 'remarks' => $remarks, 'changed_by' => $by,
            ]);

            if ($byAdmin) {
                $msg = $new === self::READY
                    ? "Your request {$this->reference_number} is ready to pick up."
                    : "Your request {$this->reference_number} is now: {$new}.";
                $this->notifyStudent($msg);
            } else {
                $this->notifyAdmins("{$this->reference_number} was {$new} by the student.");
            }
        });
    }
}
