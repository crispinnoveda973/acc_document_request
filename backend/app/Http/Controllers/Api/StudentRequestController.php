<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDocumentRequest;
use App\Http\Resources\DocumentRequestResource;
use App\Models\DocumentRequest;
use App\Models\DocumentType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class StudentRequestController extends Controller
{
    private const WITH = ['documentType', 'histories.changer', 'processor'];

    public function index(Request $r)
    {
        $items = DocumentRequest::where('student_id', $r->user()->student->id)
            ->with('documentType')->latest()->get();
        return DocumentRequestResource::collection($items);
    }

    public function store(StoreDocumentRequest $r)
    {
        $d = $r->validated();
        $student = $r->user()->student;
        $type = DocumentType::findOrFail($d['document_type_id']);

        $store = fn (string $field, string $dir) => $r->hasFile($field) ? $r->file($field)->store($dir, 'public') : null;
        $attachment = $store('attachment', 'attachments');
        $proof = $store('payment_proof', 'payments');
        $letter = $store('authorization_letter', 'authorization');

        $hasPayment = ! empty($d['payment_reference']) || $proof;
        $self = $d['pickup_by'] === 'self';

        $req = DB::transaction(function () use ($d, $student, $type, $attachment, $proof, $letter, $hasPayment, $self, $r) {
            $req = DocumentRequest::create([
                'reference_number' => DocumentRequest::nextReference(),
                'transaction_number' => DocumentRequest::nextTransaction(),
                'student_id' => $student->id,
                'document_type_id' => $type->id,
                'copies' => $d['copies'],
                'purpose' => strip_tags($d['purpose']),
                'preferred_claim_date' => $d['preferred_claim_date'] ?? null,
                'status' => 'Pending',
                'attachment_path' => $attachment,
                'amount' => $type->fee * $d['copies'],
                'payment_method' => $d['payment_method'],
                'payment_reference' => isset($d['payment_reference']) ? strip_tags($d['payment_reference']) : null,
                'payment_proof_path' => $proof,
                'payment_status' => $hasPayment ? 'For Verification' : 'Unpaid',
                'pickup_by' => $d['pickup_by'],
                'representative_name' => $self ? null : strip_tags($d['representative_name']),
                'authorization_letter_path' => $self ? null : $letter,
            ]);
            $req->histories()->create([
                'old_status' => null, 'new_status' => 'Pending',
                'remarks' => 'Request submitted.', 'changed_by' => $r->user()->id,
            ]);
            return $req;
        });

        // Tell every admin that a new request came in.
        $req->notifyAdmins("New request {$req->reference_number} ({$type->name}) from {$r->user()->name}.");

        return (new DocumentRequestResource($req->load('documentType')))->response()->setStatusCode(201);
    }

    public function show(Request $r, DocumentRequest $documentRequest)
    {
        Gate::authorize('view', $documentRequest);
        return new DocumentRequestResource($documentRequest->load(self::WITH));
    }

    public function cancel(Request $r, DocumentRequest $documentRequest)
    {
        Gate::authorize('cancel', $documentRequest);
        $reason = trim((string) $r->input('reason'));
        $documentRequest->changeStatus('Cancelled', $reason !== '' ? strip_tags($reason) : 'Cancelled by student.', $r->user()->id, false);
        return new DocumentRequestResource($documentRequest->fresh(self::WITH));
    }

    /** Student sends (or corrects) the payment reference / receipt after paying. */
    public function pay(Request $r, DocumentRequest $documentRequest)
    {
        Gate::authorize('pay', $documentRequest);
        $d = $r->validate([
            'payment_method' => ['required', 'in:'.implode(',', DocumentRequest::PAYMENT_METHODS)],
            'payment_reference' => ['nullable', 'string', 'max:80', 'required_without:payment_proof'],
            'payment_proof' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120', 'required_without:payment_reference'],
        ], ['payment_reference.required_without' => 'Enter your payment reference number or upload your receipt.']);

        if ($r->hasFile('payment_proof')) {
            $documentRequest->payment_proof_path = $r->file('payment_proof')->store('payments', 'public');
        }
        $documentRequest->fill([
            'payment_method' => $d['payment_method'],
            'payment_reference' => isset($d['payment_reference']) ? strip_tags($d['payment_reference']) : $documentRequest->payment_reference,
            'payment_status' => 'For Verification',
        ])->save();

        $documentRequest->histories()->create([
            'old_status' => $documentRequest->status, 'new_status' => $documentRequest->status,
            'remarks' => "Payment details submitted ({$d['payment_method']}).", 'changed_by' => $r->user()->id,
        ]);
        $documentRequest->notifyAdmins("Payment submitted for {$documentRequest->reference_number}. Please verify.");

        return new DocumentRequestResource($documentRequest->fresh(self::WITH));
    }
}
