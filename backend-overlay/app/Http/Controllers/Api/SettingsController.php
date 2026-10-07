<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    private function files(): array
    {
        return collect(Setting::files())->map(fn ($f, $i) => [
            'index' => $i,
            'name' => $f['name'],
            'url' => '/storage/'.$f['path'],
            'is_image' => (bool) preg_match('/\.(jpe?g|png|webp)$/i', $f['path']),
        ])->values()->all();
    }

    /** Public: shown on the login page. */
    public function info()
    {
        return response()->json(['data' => collect(Setting::allKeyed())->only(Setting::PUBLIC_KEYS)]);
    }

    /** Any logged-in user: about, contact, payment accounts, claim steps + uploaded process files. */
    public function index()
    {
        $all = collect(Setting::allKeyed())->only(Setting::TEXT_KEYS);
        return response()->json(['data' => $all->all() + ['claim_files' => $this->files()]]);
    }

    public function update(Request $r)
    {
        $rules = collect(Setting::TEXT_KEYS)->mapWithKeys(fn ($k) => [$k => ['nullable', 'string', 'max:5000']])->all();
        $d = $r->validate($rules);
        foreach ($d as $k => $v) {
            Setting::put($k, $v === null ? null : strip_tags($v));
        }
        return $this->index();
    }

    public function uploadClaimFile(Request $r)
    {
        $r->validate(['file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240']]);
        $file = $r->file('file');
        $list = Setting::files();
        $list[] = ['name' => $file->getClientOriginalName(), 'path' => $file->store('claim-process', 'public')];
        Setting::put('claim_files', json_encode($list));
        return $this->index();
    }

    public function deleteClaimFile(int $index)
    {
        $list = Setting::files();
        abort_unless(isset($list[$index]), 404);
        Storage::disk('public')->delete($list[$index]['path']);
        array_splice($list, $index, 1);
        Setting::put('claim_files', json_encode(array_values($list)));
        return $this->index();
    }
}
