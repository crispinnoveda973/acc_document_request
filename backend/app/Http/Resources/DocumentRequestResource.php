<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentRequestResource extends JsonResource
{
    private function url(?string $p): ?string { return $p ? '/storage/'.$p : null; }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference_number' => $this->reference_number,
            'transaction_number' => $this->transaction_number,
            'status' => $this->status,
            'copies' => $this->copies,
            'purpose' => $this->purpose,
            'preferred_claim_date' => $this->preferred_claim_date?->format('Y-m-d'),
            'pickup_date' => $this->pickup_date?->format('Y-m-d'),
            'rejection_reason' => $this->rejection_reason,
            'attachment_url' => $this->url($this->attachment_path),

            'amount' => $this->amount,
            'payment_method' => $this->payment_method,
            'payment_reference' => $this->payment_reference,
            'payment_proof_url' => $this->url($this->payment_proof_path),
            'payment_status' => $this->payment_status,
            'payment_submitted_at' => $this->payment_submitted_at?->toIso8601String(),
            'payment_verified_at' => $this->payment_verified_at?->toIso8601String(),
            'payment_verified_by' => $this->whenLoaded('paymentVerifier', fn () => $this->paymentVerifier?->name),

            'pickup_by' => $this->pickup_by,
            'representative_name' => $this->representative_name,
            'authorization_letter_url' => $this->url($this->authorization_letter_path),

            'document_type' => $this->whenLoaded('documentType', fn () => [
                'id' => $this->documentType->id, 'name' => $this->documentType->name,
                'fee' => $this->documentType->fee, 'processing_days' => $this->documentType->processing_days,
            ]),
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'student_number' => $this->student->student_number,
                'course' => $this->student->course,
                'year_level' => $this->student->year_level,
                'contact_number' => $this->student->contact_number,
                'name' => $this->student->user?->name,
                'email' => $this->student->user?->email,
                'avatar_url' => $this->student->user?->avatar_url,
            ]),
            'processor' => $this->whenLoaded('processor', fn () => $this->processor?->name),
            'histories' => $this->whenLoaded('histories', fn () => $this->histories->map(fn ($h) => [
                'id' => $h->id, 'old_status' => $h->old_status, 'new_status' => $h->new_status,
                'remarks' => $h->remarks, 'by' => $h->changer?->name, 'role' => $h->changer?->role,
                'by_avatar_url' => $h->changer?->avatar_url,
                'created_at' => $h->created_at?->toIso8601String(),
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
