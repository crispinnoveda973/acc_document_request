<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DocumentRequest extends Model
{
    use SoftDeletes;

    public const READY = 'Ready for Pick-up';
    public const STATUSES = ['Pending', 'Under Review', 'Approved', 'Processing', self::READY, 'Completed', 'Rejected', 'Cancelled'];
    public const FINAL = ['Completed', 'Rejected', 'Cancelled'];
    public const PAYMENT_METHODS = ['GCash', 'Bank Transfer'];

    protected $fillable = [
        'reference_number', 'transaction_number', 'student_id', 'document_type_id', 'copies', 'purpose',
        'preferred_claim_date', 'status', 'pickup_date', 'attachment_path', 'rejection_reason',
        'amount', 'payment_method', 'payment_reference', 'payment_proof_path', 'payment_status',
        'pickup_by', 'representative_name', 'authorization_letter_path', 'processed_by',
    ];
    protected $casts = ['preferred_claim_date' => 'date', 'pickup_date' => 'date', 'amount' => 'decimal:2'];

    public function student() { return $this->belongsTo(Student::class); }
    public function documentType() { return $this->belongsTo(DocumentType::class); }
    public function processor() { return $this->belongsTo(User::class, 'processed_by'); }
    public function histories() { return $this->hasMany(StatusHistory::class)->orderBy('id'); }

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
    public function changeStatus(string $new, ?string $remarks, int $by, bool $byAdmin = true, ?string $pickupDate = null): void
    {
        DB::transaction(function () use ($new, $remarks, $by, $byAdmin, $pickupDate) {
            $old = $this->status;
            $this->status = $new;
            if ($byAdmin) $this->processed_by = $by;
            if ($new === 'Rejected') $this->rejection_reason = $remarks;
            if ($new === self::READY && $pickupDate) $this->pickup_date = $pickupDate;
            $this->save();

            $this->histories()->create([
                'old_status' => $old, 'new_status' => $new, 'remarks' => $remarks, 'changed_by' => $by,
            ]);

            if ($byAdmin) {
                $msg = $new === self::READY && $this->pickup_date
                    ? "Your request {$this->reference_number} is ready for pick-up on ".$this->pickup_date->format('M d, Y').'.'
                    : "Your request {$this->reference_number} is now: {$new}.";
                $this->notifyStudent($msg);
            } else {
                $this->notifyAdmins("{$this->reference_number} was {$new} by the student.");
            }
        });
    }
}
