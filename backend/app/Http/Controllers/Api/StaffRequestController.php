<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentRequestResource;
use App\Models\DocumentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffRequestController extends Controller
{
    private const FULL = ['student.user', 'documentType', 'processor', 'histories.changer'];

    public function stats()
    {
        $counts = DocumentRequest::select('status', DB::raw('count(*) as c'))->groupBy('status')->pluck('c', 'status');
        $byStatus = collect(DocumentRequest::STATUSES)->mapWithKeys(fn ($s) => [$s => (int) ($counts[$s] ?? 0)]);
        $recent = DocumentRequest::with(['student.user', 'documentType'])->latest()->take(6)->get();

        return response()->json([
            'total' => $byStatus->sum(),
            'counts' => $byStatus,
            'recent' => DocumentRequestResource::collection($recent)->resolve(),
        ]);
    }

    public function index(Request $r)
    {
        $q = DocumentRequest::with(['student.user', 'documentType']);

        if ($r->boolean('trashed')) $q->onlyTrashed();
        if ($r->filled('status')) $q->where('status', $r->status);
        if ($r->filled('document_type_id')) $q->where('document_type_id', $r->document_type_id);
        if ($r->filled('date_from')) $q->whereDate('created_at', '>=', $r->date_from);
        if ($r->filled('date_to')) $q->whereDate('created_at', '<=', $r->date_to);
        if ($s = trim((string) $r->search)) {
            $q->where(function ($w) use ($s) {
                $w->where('reference_number', 'like', "%$s%")
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
        $req->update($d);
        $req->histories()->create([
            'old_status' => $req->status, 'new_status' => $req->status,
            'remarks' => 'Request details edited by staff.', 'changed_by' => $r->user()->id,
        ]);
        return new DocumentRequestResource($req->load(self::FULL));
    }

    public function updateStatus(Request $r, $id)
    {
        $req = DocumentRequest::findOrFail($id);
        $d = $r->validate([
            'status' => ['required', Rule::in(DocumentRequest::STATUSES)],
            'remarks' => ['nullable', 'string', 'max:1000', 'required_if:status,Rejected'],
        ], ['remarks.required_if' => 'A reason is required when rejecting a request.']);

        if (in_array($req->status, DocumentRequest::FINAL, true)) {
            throw ValidationException::withMessages(['status' => "This request is already {$req->status} and can no longer change."]);
        }
        if ($d['status'] === $req->status) {
            throw ValidationException::withMessages(['status' => 'The request already has that status.']);
        }

        $req->changeStatus($d['status'], isset($d['remarks']) ? strip_tags($d['remarks']) : null, $r->user()->id);
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
        $req->student?->user?->notices()->create([
            'document_request_id' => $req->id,
            'message' => "New remark on your request {$req->reference_number}.",
        ]);
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
