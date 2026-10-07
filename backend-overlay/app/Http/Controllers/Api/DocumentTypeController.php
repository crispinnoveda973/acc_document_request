<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentType;
use Illuminate\Http\Request;

class DocumentTypeController extends Controller
{
    /** Students get active types; admins may pass ?all=1 to include inactive. */
    public function index(Request $r)
    {
        $q = DocumentType::orderBy('name');
        if (! ($r->boolean('all') && $r->user()->role === 'admin')) {
            $q->where('is_active', true);
        }
        return response()->json(['data' => $q->get()]);
    }

    private function rules(?int $id = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150', 'unique:document_types,name'.($id ? ",$id" : '')],
            'description' => ['nullable', 'string', 'max:1000'],
            'fee' => ['required', 'numeric', 'min:0', 'max:99999'],
            'processing_days' => ['required', 'integer', 'min:1', 'max:365'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function store(Request $r)
    {
        return response()->json(['data' => DocumentType::create($r->validate($this->rules()))], 201);
    }

    public function update(Request $r, DocumentType $documentType)
    {
        $documentType->update($r->validate($this->rules($documentType->id)));
        return response()->json(['data' => $documentType]);
    }

    public function destroy(DocumentType $documentType)
    {
        if ($documentType->requests()->withTrashed()->exists()) {
            $documentType->update(['is_active' => false]);
            return response()->json(['message' => 'Type is used by existing requests, so it was deactivated instead.']);
        }
        $documentType->delete();
        return response()->json(['message' => 'Document type deleted.']);
    }
}
