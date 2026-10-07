<?php

namespace App\Policies;

use App\Models\DocumentRequest;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class DocumentRequestPolicy
{
    private function owns(User $user, DocumentRequest $req): bool
    {
        return $user->student && $user->student->id === $req->student_id;
    }

    public function view(User $user, DocumentRequest $req): bool
    {
        return $user->role === 'admin' || $this->owns($user, $req);
    }

    public function cancel(User $user, DocumentRequest $req): Response
    {
        if (! $this->owns($user, $req)) {
            return Response::deny('You are not allowed to cancel this request.');
        }
        return $req->status === 'Pending'
            ? Response::allow()
            : Response::deny('Only requests that are still Pending can be cancelled. Please contact the college office.');
    }

    public function pay(User $user, DocumentRequest $req): Response
    {
        if (! $this->owns($user, $req)) {
            return Response::deny('You are not allowed to update this request.');
        }
        if (in_array($req->status, DocumentRequest::FINAL, true)) {
            return Response::deny('This request is closed, so payment can no longer be updated.');
        }
        return $req->payment_status === 'Verified'
            ? Response::deny('Your payment was already verified.')
            : Response::allow();
    }
}
