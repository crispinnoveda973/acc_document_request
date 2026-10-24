<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentRequest;
use App\Models\DocumentType;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin report: how many requests were made for each document type in a day, a week (Mon-Sun) or a month.
 * Requests are counted by the date they were SUBMITTED (created_at); trashed requests are not counted.
 * The day boundaries follow APP_TIMEZONE (set it to Asia/Manila in .env).
 */
class ReportController extends Controller
{
    /** GET /api/admin/reports?period=day|week|month&date=YYYY-MM-DD */
    public function show(Request $r)
    {
        [$period, $from, $to] = $this->range($r);

        $stats = $this->perType($from, $to);
        $rows = DocumentType::orderBy('name')->get()
            // Hide switched-off types unless they still had requests in this period.
            ->filter(fn ($t) => $t->is_active || isset($stats[$t->id]))
            ->map(function ($t) use ($stats) {
                $s = $stats[$t->id] ?? null;
                $requests = (int) ($s->requests ?? 0);
                $completed = (int) ($s->completed ?? 0);
                $closed = (int) ($s->closed_unfinished ?? 0);
                return [
                    'document_type_id' => $t->id, 'name' => $t->name,
                    'requests' => $requests, 'copies' => (int) ($s->copies ?? 0),
                    'completed' => $completed, 'in_progress' => $requests - $completed - $closed,
                    'rejected_cancelled' => $closed, 'collected' => round((float) ($s->collected ?? 0), 2),
                ];
            })->values();

        $totals = [
            'requests' => $rows->sum('requests'), 'copies' => $rows->sum('copies'), 'completed' => $rows->sum('completed'),
            'in_progress' => $rows->sum('in_progress'), 'rejected_cancelled' => $rows->sum('rejected_cancelled'),
            'collected' => round($rows->sum('collected'), 2),
        ];

        // Requests per day (for the week / month bar chart); days without requests show 0.
        $perDay = DocumentRequest::whereBetween('created_at', [$from, $to])
            ->selectRaw('DATE(created_at) as d, count(*) as c')->groupByRaw('DATE(created_at)')->pluck('c', 'd');
        $daily = collect(CarbonPeriod::create($from->copy()->startOfDay(), $to->copy()->startOfDay()))
            ->map(fn ($day) => ['date' => $day->format('Y-m-d'), 'count' => (int) ($perDay[$day->format('Y-m-d')] ?? 0)])->values();

        return response()->json([
            'period' => $period, 'from' => $from->format('Y-m-d'), 'to' => $to->format('Y-m-d'),
            'rows' => $rows, 'totals' => $totals, 'daily' => $daily,
            'summary' => $this->summary($from),
        ]);
    }

    /** GET /api/admin/reports/export?period=...&date=...  -> CSV download (opens in Excel). */
    public function export(Request $r)
    {
        [$period, $from, $to] = $this->range($r);
        $stats = $this->perType($from, $to);
        $types = DocumentType::orderBy('name')->get()->filter(fn ($t) => $t->is_active || isset($stats[$t->id]));

        $file = sprintf('document-requests-%s-%s.csv', $period, $from->format('Y-m-d'));

        return response()->streamDownload(function () use ($types, $stats, $period, $from, $to) {
            $out = fopen('php://output', 'w');
            $put = fn (array $row) => fputcsv($out, $row, ',', '"', '');   // explicit empty escape char (required on PHP 8.4+)
            fwrite($out, "\xEF\xBB\xBF");   // UTF-8 BOM so Excel shows the characters correctly
            $put(['Document request report', ucfirst($period), $from->format('Y-m-d').' to '.$to->format('Y-m-d')]);
            $put(['Document type', 'Requests', 'Copies', 'Completed', 'In progress', 'Rejected / Cancelled', 'Payments collected (PHP)']);
            $sum = array_fill(0, 6, 0);
            foreach ($types as $t) {
                $s = $stats[$t->id] ?? null;
                $req = (int) ($s->requests ?? 0); $done = (int) ($s->completed ?? 0); $closed = (int) ($s->closed_unfinished ?? 0);
                $line = [$req, (int) ($s->copies ?? 0), $done, $req - $done - $closed, $closed, round((float) ($s->collected ?? 0), 2)];
                foreach ($line as $i => $v) $sum[$i] += $v;
                $put(array_merge([$this->csvSafe($t->name)], $line));
            }
            $put(array_merge(['TOTAL'], $sum));
            fclose($out);
        }, $file, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Validates ?period & ?date and returns [period, from (start of first day), to (end of last day)]. */
    private function range(Request $r): array
    {
        $d = $r->validate([
            'period' => ['nullable', Rule::in(['day', 'week', 'month'])],
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);
        $period = $d['period'] ?? 'day';
        $date = isset($d['date']) ? Carbon::createFromFormat('Y-m-d', $d['date'])->startOfDay() : now()->startOfDay();

        return match ($period) {
            'week' => [$period, $date->copy()->startOfWeek(Carbon::MONDAY), $date->copy()->endOfWeek(Carbon::SUNDAY)],
            'month' => [$period, $date->copy()->startOfMonth(), $date->copy()->endOfMonth()],
            default => [$period, $date->copy()->startOfDay(), $date->copy()->endOfDay()],
        };
    }

    /** One grouped query: counts per document type (all values are bound parameters, nothing is concatenated). */
    private function perType(Carbon $from, Carbon $to)
    {
        return DocumentRequest::whereBetween('created_at', [$from, $to])
            ->selectRaw(
                'document_type_id, count(*) as requests, coalesce(sum(copies), 0) as copies,
                 coalesce(sum(case when status = ? then 1 else 0 end), 0) as completed,
                 coalesce(sum(case when status in (?, ?) then 1 else 0 end), 0) as closed_unfinished,
                 coalesce(sum(case when payment_status = ? then amount else 0 end), 0) as collected',
                ['Completed', 'Rejected', 'Cancelled', 'Verified']
            )->groupBy('document_type_id')->get()->keyBy('document_type_id');
    }

    /** Totals for the day, week and month that contain the chosen date (the three cards on top of the report page). */
    private function summary(Carbon $anchor): array
    {
        $count = fn (Carbon $a, Carbon $b) => [
            'requests' => DocumentRequest::whereBetween('created_at', [$a, $b])->count(),
            'copies' => (int) DocumentRequest::whereBetween('created_at', [$a, $b])->sum('copies'),
        ];
        return [
            'day' => $count($anchor->copy()->startOfDay(), $anchor->copy()->endOfDay()),
            'week' => $count($anchor->copy()->startOfWeek(Carbon::MONDAY), $anchor->copy()->endOfWeek(Carbon::SUNDAY)),
            'month' => $count($anchor->copy()->startOfMonth(), $anchor->copy()->endOfMonth()),
        ];
    }

    /** CSV / Excel formula injection guard: a cell starting with = + - @ would run as a formula when opened in Excel. */
    private function csvSafe(string $v): string
    {
        return preg_match('/^[=+\-@\t\r]/', $v) ? "'".$v : $v;
    }
}
