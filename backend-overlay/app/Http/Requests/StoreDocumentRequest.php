<?php

namespace App\Http\Requests;

use App\Models\DocumentRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $file = ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'];
        return [
            'document_type_id' => ['required', Rule::exists('document_types', 'id')->where('is_active', true)],
            'copies' => ['required', 'integer', 'min:1', 'max:10'],
            'purpose' => ['required', 'string', 'max:255'],
            'preferred_claim_date' => ['nullable', 'date', 'after_or_equal:today'],
            'attachment' => $file,

            'payment_method' => ['required', Rule::in(DocumentRequest::PAYMENT_METHODS)],
            'payment_reference' => DocumentRequest::referenceRules($this->input('payment_method')),
            'payment_proof' => $file,

            'pickup_by' => ['required', Rule::in(['self', 'representative'])],
            'representative_name' => ['nullable', 'required_if:pickup_by,representative', 'string', 'max:120'],
            'authorization_letter' => $file,
        ];
    }

    /** Normalize the reference first so the format and uniqueness checks compare the same value. */
    protected function prepareForValidation(): void
    {
        if ($this->filled('payment_reference')) {
            $this->merge(['payment_reference' => DocumentRequest::normalizeReference($this->input('payment_reference'))]);
        }
    }

    public function messages(): array
    {
        return DocumentRequest::referenceMessages() + [
            'representative_name.required_if' => 'Please enter the full name of the person who will pick up the document.',
        ];
    }
}
