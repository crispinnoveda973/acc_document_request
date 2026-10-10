<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentRequestResource;
use App\Models\DocumentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminRequestController extends Controller
{
    private const FULL = ['student.user', 'documentType', 'processor', 'paymentVerifier', 'histories.changer'];

    public function stats()
    {
        $counts = DocumentRequest::select('status', DB::raw('count(*) as c'))->groupBy('status')->pluck('c', 'status');
        $byStatus = collect(DocumentRequest::STATUSES)->mapWithKeys(fn ($s) => [$s => (int) ($counts[$s] ?? 0)]);
        $with = ['student.user', 'documentType'];

        return response()->json([
            'total' => $byStatus->sum(),
            'counts' => $byStatus,
            'today' => DocumentRequest::whereDate('created_at', today())->count(),
            'payments_to_verify' => DocumentRequest::where('payment_status', 'For Verification')
                ->whereNotIn('status', DocumentRequest::FINAL)->count(),
            'pending' => DocumentRequestResource::collection(
                DocumentRequest::with($with)->where('status', 'Pending')->oldest()->take(6)->get()
            )->resolve(),
            'ready' => DocumentRequestResource::collection(
                DocumentRequest::with($with)->where('status', DocumentRequest::READY)->orderBy('pickup_date')->take(6)->get()
            )->resolve(),
            'recent' => DocumentRequestResource::collection(
                DocumentRequest::with($with)->latest()->take(8)->get()
            )->resolve(),
        ]);
    }

    public function index(Request $r)
    {
        $q = DocumentRequest::with(['student.user', 'documentType']);

        if ($r->boolean('trashed')) $q->onlyTrashed();
        if ($r->filled('status')) $q->where('status', $r->status);
        if ($r->filled('payment_status')) $q->where('payment_status', $r->payment_status);
        if ($r->filled('document_type_id')) $q->where('document_type_id', $r->document_type_id);
        if ($r->filled('date_from')) $q->whereDate('created_at', '>=', $r->date_from);
        if ($r->filled('date_to')) $q->whereDate('created_at', '<=', $r->date_to);
        if ($s = trim((string) $r->search)) {
            $q->where(function ($w) use ($s) {
                $w->where('reference_number', 'like', "%$s%")
                  ->orWhere('transaction_number', 'like', "%$s%")
                  ->orWhereHas('student', fn ($x) => $x->where('student_number', 'like', "%$s%")
                      ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%$s%")));
            });
        }

        return DocumentRequestResource::collection($q->latest()->paginate(10)->withQueryString());
    }

    public function show($id)
    {
        return new DocumentRequestResource(DocumentRequest::withTrashed()->with(self::FULL)->findOrFail($id));
    }

    public function update(Request $r, $id)
    {
        $req = DocumentRequest::findOrFail($id);
        $d = $r->validate([
            'copies' => ['required', 'integer', 'min:1', 'max:10'],
            'purpose' => ['required', 'string', 'max:255'],
            'preferred_claim_date' => ['nullable', 'date'],
        ]);
        $d['purpose'] = strip_tags($d['purpose']);
        $d['amount'] = $req->documentType->fee * $d['copies'];
        $req->update($d);
        $req->histories()->create([
            'old_status' => $req->status, 'new_status' => $req->status,
            'remarks' => 'Request details edited by admin.', 'changed_by' => $r->user()->id,
        ]);
        return new DocumentRequestResource($req->load(self::FULL));
    }

    public function updateStatus(Request $r, $id)
    {
        $req = DocumentRequest::findOrFail($id);
        $d = $r->validate([
            'status' => ['required', Rule::in(DocumentRequest::STATUSES)],
            'remarks' => ['nullable', 'string', 'max:1000', 'required_if:status,Rejected'],
            'pickup_date' => ['nullable', 'date', 'after_or_equal:today', 'required_if:status,'.DocumentRequest::READY],
        ], [
            'remarks.required_if' => 'A reason is required when rejecting a request.',
            'pickup_date.required_if' => 'Please choose the pick-up date.',
            'pickup_date.after_or_equal' => 'The pick-up date cannot be in the past.',
        ]);

        if (in_array($req->status, DocumentRequest::FINAL, true)) {
            throw ValidationException::withMessages(['status' => "This request is already {$req->status} and can no longer change."]);
        }

        // Same status is only allowed to re-schedule the pick-up date.
        if ($d['status'] === $req->status) {
            if ($req->status !== DocumentRequest::READY || empty($d['pickup_date'])) {
                throw ValidationException::withMessages(['status' => 'The request already has that status.']);
            }
            $req->update(['pickup_date' => $d['pickup_date']]);
            $req->histories()->create([
                'old_status' => $req->status, 'new_status' => $req->status, 'changed_by' => $r->user()->id,
                'remarks' => 'Pick-up date set to '.$req->pickup_date->format('M d, Y').'.'.(! empty($d['remarks']) ? ' '.strip_tags($d['remarks']) : ''),
            ]);
            $req->notifyStudent("Pick-up date for {$req->reference_number} is now ".$req->pickup_date->format('M d, Y').'.');
            return new DocumentRequestResource($req->fresh(self::FULL));
        }

        // A document that has to be paid for cannot be released before the payment is verified.
        if (in_array($d['status'], DocumentRequest::NEEDS_VERIFIED_PAYMENT, true)
            && $req->amount > 0 && $req->payment_status !== 'Verified') {
            throw ValidationException::withMessages([
                'status' => "Verify the student's payment first before setting the status to \"{$d['status']}\".",
            ]);
        }

        $req->changeStatus(
            $d['status'],
            isset($d['remarks']) ? strip_tags($d['remarks']) : null,
            $r->user()->id,
            true,
            $d['status'] === DocumentRequest::READY ? $d['pickup_date'] : null
        );
        return new DocumentRequestResource($req->fresh(self::FULL));
    }

    /** Admin confirms (or rejects) the student's payment. */
    public function updatePayment(Request $r, $id)
    {
        $req = DocumentRequest::findOrFail($id);
        $d = $r->validate([
            'payment_status' => ['required', Rule::in(['Verified', 'Unpaid'])],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        if (in_array($req->status, DocumentRequest::FINAL, true)) {
            throw ValidationException::withMessages(['payment_status' => "This request is already {$req->status}, so its payment can no longer be changed."]);
        }
        if ($d['payment_status'] === 'Verified') {
            if ($req->payment_status === 'Verified') {
                throw ValidationException::withMessages(['payment_status' => 'This payment is already verified.']);
            }
            // Only payments the student has actually submitted (reference no. and/or receipt) can be verified.
            if ($req->payment_status !== 'For Verification') {
                throw ValidationException::withMessages(['payment_status' => 'The student has not sent any payment details yet, so there is nothing to verify.']);
            }
        }

        $req->update($d['payment_status'] === 'Verified'
            ? ['payment_status' => 'Verified', 'payment_verified_at' => now(), 'payment_verified_by' => $r->user()->id]
            // "Payment not received": the student must send their details again.
            : ['payment_status' => 'Unpaid', 'payment_submitted_at' => null, 'payment_verified_at' => null, 'payment_verified_by' => null]);
        $note = $d['payment_status'] === 'Verified'
            ? 'Payment verified.'
            : 'Payment could not be verified, please send your payment details again.';
        $req->histories()->create([
            'old_status' => $req->status, 'new_status' => $req->status, 'changed_by' => $r->user()->id,
            'remarks' => $note.(! empty($d['remarks']) ? ' '.strip_tags($d['remarks']) : ''),
        ]);
        $req->notifyStudent("{$req->reference_number}: ".$note);

        return new DocumentRequestResource($req->fresh(self::FULL));
    }

    public function addRemark(Request $r, $id)
    {
        $req = DocumentRequest::findOrFail($id);
        $d = $r->validate(['remarks' => ['required', 'string', 'max:1000']]);
        $req->histories()->create([
            'old_status' => $req->status, 'new_status' => $req->status,
            'remarks' => strip_tags($d['remarks']), 'changed_by' => $r->user()->id,
        ]);
        $req->notifyStudent("New remark on your request {$req->reference_number}.");
        return new DocumentRequestResource($req->fresh(self::FULL));
    }

    public function destroy($id)
    {
        DocumentRequest::findOrFail($id)->delete();
        return response()->json(['message' => 'Request moved to trash.']);
    }

    public function restore($id)
    {
        $req = DocumentRequest::onlyTrashed()->findOrFail($id);
        $req->restore();
        return new DocumentRequestResource($req->load(self::FULL));
    }
}
