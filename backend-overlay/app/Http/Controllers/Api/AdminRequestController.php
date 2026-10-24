<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentRequestResource;
use App\Models\DocumentRequest;
use App\Support\Search;
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
            'payments_to_verify' => DocumentRequest::where('payment_status', 'Pending Verification')
                ->whereNotIn('status', DocumentRequest::FINAL)->count(),
            'pending' => DocumentRequestResource::collection(
                DocumentRequest::with($with)->where('status', 'Pending')->oldest()->take(6)->get()
            )->resolve(),
            'ready' => DocumentRequestResource::collection(
                DocumentRequest::with($with)->where('status', DocumentRequest::READY)->latest('updated_at')->take(6)->get()
            )->resolve(),
            'recent' => DocumentRequestResource::collection(
                DocumentRequest::with($with)->latest()->take(8)->get()
            )->resolve(),
        ]);
    }

    public function index(Request $r)
    {
        // Every filter is validated first (type, allowed values, length) and then passed to the query as a bound parameter.
        $f = $r->validate([
            'status' => ['nullable', Rule::in(DocumentRequest::STATUSES)],
            'payment_status' => ['nullable', Rule::in(DocumentRequest::PAYMENT_STATUSES)],
            'document_type_id' => ['nullable', 'integer'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $q = DocumentRequest::with(['student.user', 'documentType']);

        if ($r->boolean('trashed')) $q->onlyTrashed();
        if (! empty($f['status'])) $q->where('status', $f['status']);
        if (! empty($f['payment_status'])) $q->where('payment_status', $f['payment_status']);
        if (! empty($f['document_type_id'])) $q->where('document_type_id', $f['document_type_id']);
        if (! empty($f['date_from'])) $q->whereDate('created_at', '>=', $f['date_from']);
        if (! empty($f['date_to'])) $q->whereDate('created_at', '<=', $f['date_to']);
        if (! empty($f['search'])) {
            $like = Search::like($f['search']);   // user's % and _ are escaped so they cannot act as wildcards
            $q->where(function ($w) use ($like) {
                $w->where('reference_number', 'like', $like)
                  ->orWhere('transaction_number', 'like', $like)
                  ->orWhereHas('student', fn ($x) => $x->where('student_number', 'like', $like)
                      ->orWhereHas('user', fn ($u) => $u->where('name', 'like', $like)));
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
        ], [
            'remarks.required_if' => 'A reason is required when rejecting a request.',
        ]);

        if (in_array($req->status, DocumentRequest::FINAL, true)) {
            throw ValidationException::withMessages(['status' => "This request is already {$req->status} and can no longer change."]);
        }
        if ($d['status'] === $req->status) {
            throw ValidationException::withMessages(['status' => 'The request already has that status.']);
        }

        // A document that has to be paid for cannot be released before the payment is verified (or the cash recorded).
        if (in_array($d['status'], DocumentRequest::NEEDS_VERIFIED_PAYMENT, true)
            && $req->amount > 0 && $req->payment_status !== 'Verified') {
            throw ValidationException::withMessages([
                'status' => "Confirm the student's payment first before setting the status to \"{$d['status']}\".",
            ]);
        }

        $req->changeStatus($d['status'], isset($d['remarks']) ? strip_tags($d['remarks']) : null, $r->user()->id, true);
        return new DocumentRequestResource($req->fresh(self::FULL));
    }

    /**
     * Admin decides on a payment.
     *  - Verified : GCash / Bank Transfer after checking the reference no. / receipt, or Cash recorded at the office.
     *  - Rejected : GCash / Bank Transfer that could not be confirmed (reason required, the student must send details again).
     *  - Unpaid   : Cash only, to undo a cash payment that was recorded by mistake.
     */
    public function updatePayment(Request $r, $id)
    {
        $req = DocumentRequest::findOrFail($id);
        $d = $r->validate([
            'payment_status' => ['required', Rule::in(['Verified', 'Rejected', 'Unpaid'])],
            'remarks' => ['nullable', 'string', 'max:500', 'required_if:payment_status,Rejected'],
        ], ['remarks.required_if' => 'Please enter the reason the payment was rejected.']);

        $new = $d['payment_status'];
        $cash = $req->payment_method === 'Cash';
        $fail = fn (string $m) => throw ValidationException::withMessages(['payment_status' => $m]);

        if (in_array($req->status, DocumentRequest::FINAL, true)) {
            $fail("This request is already {$req->status}, so its payment can no longer be changed.");
        }

        if ($new === 'Verified') {
            if ($req->payment_status === 'Verified') $fail('This payment is already confirmed.');
            // Online payments: only a payment the student actually submitted can be verified. Cash: the admin records it directly.
            if (! $cash && $req->payment_status !== 'Pending Verification') {
                $fail('The student has not sent any payment details yet, so there is nothing to verify.');
            }
        } elseif ($new === 'Rejected') {
            if ($cash) $fail('Cash payments are not verified. Simply leave it unpaid until the student pays at the office.');
            if (! in_array($req->payment_status, ['Pending Verification', 'Verified'], true)) {
                $fail('There is no submitted payment to reject.');
            }
        } else { // Unpaid
            if (! $cash || $req->payment_status !== 'Verified') $fail('Only a recorded cash payment can be set back to unpaid.');
        }

        $remarks = ! empty($d['remarks']) ? strip_tags($d['remarks']) : null;

        $update = match (true) {
            $new === 'Verified' => [
                'payment_status' => 'Verified', 'payment_remarks' => null,
                'payment_submitted_at' => $req->payment_submitted_at ?? now(),   // cash has no "details sent" step
                'payment_verified_at' => now(), 'payment_verified_by' => $r->user()->id,
            ],
            // Keep the reference / receipt on file for the record; the student must send details again.
            $new === 'Rejected' => [
                'payment_status' => 'Rejected', 'payment_remarks' => $remarks,
                'payment_verified_at' => null, 'payment_verified_by' => null,
            ],
            default => [
                'payment_status' => 'Unpaid', 'payment_remarks' => null, 'payment_submitted_at' => null,
                'payment_verified_at' => null, 'payment_verified_by' => null,
            ],
        };
        $req->update($update);

        $note = match (true) {
            $new === 'Verified' && $cash => 'Cash payment recorded and confirmed.',
            $new === 'Verified' => 'Payment verified.',
            $new === 'Rejected' => 'Payment rejected. Please send your payment details again.',
            default => 'Cash payment record was removed.',
        };
        $req->histories()->create([
            'old_status' => $req->status, 'new_status' => $req->status, 'changed_by' => $r->user()->id,
            'remarks' => $note.($remarks ? ' Reason: '.$remarks : ''),
        ]);
        $req->notifyStudent("{$req->reference_number}: ".$note.($new === 'Rejected' && $remarks ? " Reason: {$remarks}" : ''));

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
