<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StaffAccountController extends Controller
{
    public function index()
    {
        return response()->json(['data' => User::where('role', 'staff')->orderBy('name')->get(['id', 'name', 'email', 'is_active'])]);
    }

    public function store(Request $r)
    {
        $d = $r->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);
        $u = User::create($d + ['role' => 'staff', 'is_active' => true]);
        return response()->json(['data' => $u->only('id', 'name', 'email', 'is_active')], 201);
    }

    public function update(Request $r, User $staff)
    {
        abort_unless($staff->role === 'staff', 404);
        $d = $r->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users')->ignore($staff->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'is_active' => ['required', 'boolean'],
        ]);
        if (empty($d['password'])) unset($d['password']);
        $staff->update($d);
        if (! $d['is_active']) $staff->tokens()->delete();
        return response()->json(['data' => $staff->only('id', 'name', 'email', 'is_active')]);
    }

    public function destroy(User $staff)
    {
        abort_unless($staff->role === 'staff', 404);
        $staff->tokens()->delete();
        $staff->delete();
        return response()->json(['message' => 'Staff account deleted.']);
    }
}
