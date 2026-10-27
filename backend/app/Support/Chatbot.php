<?php

namespace App\Support;

use App\Models\DocumentRequest;
use App\Models\DocumentType;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * "ACC Assistant" - a rule-based chatbot (no external AI service, no API key, works offline on XAMPP/Laragon).
 *
 * How it works
 *  1. A reference / transaction number in the message (ACC-2026-00001, TXN-20261007-K7Q2ZP) means "look this request up".
 *  2. Otherwise the message is scored against the keyword lists in INTENTS (English + common Filipino words).
 *     The highest score wins; on a tie the intent listed FIRST wins, so specific topics are listed before generic ones.
 *  3. The answer is built from LIVE data (document types + fees, Site Settings, the user's own requests), so when the
 *     admin changes a fee or the office hours the chatbot answers with the new value automatically.
 *
 * Security
 *  - Only the logged-in user's own requests can be looked up (admins can look up any request).
 *  - Every query uses Eloquent / bound parameters, and the user's text is never echoed back or put into SQL.
 *  - The incoming text is already stripped of HTML by the SanitizeInput middleware; React escapes the reply.
 */
class Chatbot
{
    public const MAX_LENGTH = 300;

    /**
     * intent => keywords. A trailing * means "starts with" (pay* matches pay, paying, payment).
     * "word=3" sets the weight; the default weight is 2 for a phrase of several words and 1 for a single word.
     * ORDER MATTERS: on a tie the intent listed first wins.
     */
    private const INTENTS = [
        'payment_verify' => ['payment status', 'payment verification', 'pending verification', 'verif*', 'rejected payment', 'payment rejected', 'unpaid', 'not verified'],
        'statuses' => ['statuses', 'status meaning', 'meaning of', 'means', 'mean', 'ibig sabihin', 'explain status', 'what does'],
        'cancel' => ['cancel*=2', 'withdraw', 'kansela*'],
        'payment' => ['pay*', 'gcash', 'g cash', 'bank*', 'cash', 'receipt*', 'reference number', 'reference no', 'instapay', 'pesonet', 'bayad', 'magbayad', 'bayaran', 'deposit'],
        'fees' => ['fee*', 'how much', 'cost*', 'price*', 'magkano', 'amount'],
        'processing' => ['processing time', 'how long', 'how many days', 'how soon', 'turnaround', 'gaano katagal', 'katagal', 'days to process', 'when will it be ready', 'kailan', 'processing'],
        'how_to_request' => ['how to request', 'how do i request', 'request a document', 'submit*', 'apply', 'paano mag request', 'make a request', 'file a request', 'request process', 'steps to request'],
        'claim' => ['claim*', 'pick up', 'pickup', 'ready to pick up', 'kunin*', 'kukunin*', 'collect*', 'get my document', 'where to get', 'saan kukunin', 'release*'],
        'representative' => ['representative*', 'authorization', 'authorisation', 'authorization letter', 'someone else', 'somebody else', 'kapalit', 'send someone', 'other person', 'ibang tao', 'proxy', 'letter of authority'],
        'hours_contact' => ['office hours', 'hours', 'opening hours', 'what time', 'contact*', 'phone', 'telephone', 'landline', 'email', 'address', 'location', 'where is the college', 'where is the office', 'where is acc', 'anong oras', 'oras ng opisina', 'is the office open'],
        'account' => ['password*', 'profile*', 'photo*', 'picture*', 'year level', 'my account', 'forgot*'],
        'track' => ['track*=3', 'status', 'my request*=1', 'where is my', 'progress', 'update on', 'nasaan', 'follow up'],
        'admin_stats' => ['stats', 'statistics', 'summary', 'overview', 'how many', 'pending', 'to verify', 'waiting', 'today', 'total', 'dashboard', 'any new requests', 'new requests'],
        'documents' => ['documents', 'document types', 'available documents', 'what can i request', 'list of documents', 'dokumento', 'mga dokumento', 'what documents', 'which documents', 'certificates'],
        'thanks' => ['thanks', 'thank you', 'thank', 'salamat', 'maraming salamat', 'tnx'],
        'bye' => ['bye', 'goodbye', 'see you', 'paalam'],
        'greeting' => ['hi', 'hello', 'hey', 'helo', 'hola', 'good morning', 'good afternoon', 'good evening', 'kumusta', 'musta', 'magandang umaga', 'magandang hapon', 'magandang gabi'],
        'help' => ['help', 'what can you do', 'what can i ask', 'commands', 'options', 'menu', 'tulong'],
    ];

    /** Short forms students use for a document -> words that appear in the document type's name. */
    private const ALIASES = ['tor' => 'transcript', 'coe' => 'enrollment', 'cog' => 'grades', 'gmc' => 'good moral'];

    /** Words in a document name that say nothing about WHICH document it is. */
    private const NAME_STOP = ['certificate', 'certified', 'school', 'copy', 'true', 'official'];

    private const HINTS = [
        'Pending' => 'It is waiting for the admin to review it.',
        'Under Review' => 'The admin is checking the request.',
        'Approved' => 'It was approved and the document will be prepared.',
        'Processing' => 'The document is being prepared.',
        DocumentRequest::READY => 'The document is ready! Go to the college office with the transaction number and a valid ID.',
        'Completed' => 'This request is completed.',
        'Rejected' => 'This request was rejected.',
        'Cancelled' => 'This request was cancelled.',
    ];

    /* ------------------------------------------------------------------ public API */

    /** @return array{reply:string, links:array<int,array{label:string,to:string}>, suggestions:array<int,string>} */
    public static function reply(string $message, User $user): array
    {
        $admin = $user->role === 'admin';
        $intent = null;

        if (self::norm($message) === '') {
            $res = self::fallback($admin);
        } elseif ($ref = self::extractReference($message)) {
            $intent = 'track';
            $res = self::lookup($ref, $user);
        } else {
            $intent = self::detectIntent($message);
            // Students have no dashboard figures: "how many pending ..." means THEIR requests.
            if (! $admin && $intent === 'admin_stats') $intent = 'track';

            $types = in_array($intent, [null, 'fees', 'processing', 'documents'], true) ? self::matchTypes($message) : collect();
            if ($types->isNotEmpty()) {
                $res = self::typeDetail($types, $admin);
            } else {
                $res = match ($intent) {
                    'documents', 'fees', 'processing' => self::documentList($intent, $admin),
                    'how_to_request' => self::howToRequest($admin),
                    'payment' => self::payment($admin),
                    'payment_verify' => self::paymentVerify($admin),
                    'claim' => self::claim(),
                    'representative' => self::representative($admin),
                    'hours_contact' => self::contact(),
                    'track' => $admin ? self::adminStats() : self::myRequests($user),
                    'admin_stats' => self::adminStats(),
                    'cancel' => self::cancel($admin),
                    'statuses' => self::statuses(),
                    'account' => self::account(),
                    'thanks' => self::say('You\'re welcome! Ask me anything else about document requests.'),
                    'bye' => self::say('Goodbye! Come back anytime you need help with your documents.'),
                    'greeting' => self::say('Hello! I\'m the ACC Assistant. '.($admin
                        ? 'I can show request figures and look up any request for you.'
                        : 'I can help with documents, fees, payments and tracking your requests.').' What would you like to know?'),
                    'help' => self::help($admin),
                    default => self::fallback($admin),
                };
            }
        }

        $res['suggestions'] = self::chips($admin, $intent);
        return $res;
    }

    /** Which topic is the message about? null = nothing recognised. Pure function (no database), so it is unit-tested. */
    public static function detectIntent(string $message): ?string
    {
        $text = self::norm($message);
        $best = null;
        $bestScore = 0;
        foreach (self::INTENTS as $intent => $keywords) {
            $score = self::score($text, $keywords);
            if ($score > $bestScore) { $best = $intent; $bestScore = $score; }
        }
        return $best;
    }

    /** ACC-2026-00007 or TXN-20261007-K7Q2ZP anywhere in the text (spaces instead of dashes are accepted). */
    public static function extractReference(string $message): ?array
    {
        $m = strtoupper($message);
        if (preg_match('/\bACC[-\s]?(\d{4})[-\s]?(\d{5})\b/', $m, $x)) {
            return ['reference_number', 'ACC-'.$x[1].'-'.$x[2]];
        }
        if (preg_match('/\bTXN[-\s]?(\d{8})[-\s]?([A-Z0-9]{6})\b/', $m, $x)) {
            return ['transaction_number', 'TXN-'.$x[1].'-'.$x[2]];
        }
        return null;
    }

    /* ------------------------------------------------------------------ text helpers */

    /** Lower-case, punctuation (including "-") becomes a space, single spaces: "Pick-up!" -> "pick up". */
    private static function norm(string $s): string
    {
        $s = mb_strtolower($s);
        $s = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $s) ?? $s;
        return trim(preg_replace('/\s+/u', ' ', $s) ?? $s);
    }

    private static function has(string $text, string $keyword): bool
    {
        $prefix = str_ends_with($keyword, '*');
        $kw = self::norm(rtrim($keyword, '*'));
        if ($kw === '') return false;
        return (bool) preg_match('/(?<![\p{L}\p{N}])'.preg_quote($kw, '/').($prefix ? '' : '(?![\p{L}\p{N}])').'/u', $text);
    }

    private static function score(string $text, array $keywords): int
    {
        $score = 0;
        foreach ($keywords as $k) {
            [$kw, $weight] = array_pad(explode('=', $k, 2), 2, null);
            if (! self::has($text, $kw)) continue;
            $score += $weight !== null ? (int) $weight : (str_contains(self::norm(rtrim($kw, '*')), ' ') ? 2 : 1);
        }
        return $score;
    }

    private static function peso(mixed $n): string
    {
        return '₱'.number_format((float) $n, 2);
    }

    private static function days(int $n): string
    {
        return 'about '.$n.' '.($n === 1 ? 'day' : 'days');
    }

    private static function say(string $text, array $links = []): array
    {
        return ['reply' => $text, 'links' => $links];
    }

    /** Lines of the site content that the admin edits under "Site Settings". */
    private static function setting(string $key): string
    {
        return trim((string) (Setting::allKeyed()[$key] ?? ''));
    }

    /* ------------------------------------------------------------------ document types */

    /** Active document types whose name matches the message best (empty = none). */
    private static function matchTypes(string $message): Collection
    {
        $text = self::norm($message);
        foreach (self::ALIASES as $alias => $full) {
            if (self::has($text, $alias)) $text .= ' '.$full;
        }
        $words = array_filter(explode(' ', $text), fn ($w) => mb_strlen($w) >= 4);

        $hits = collect();
        foreach (DocumentType::where('is_active', true)->orderBy('name')->get() as $type) {
            $score = 0;
            foreach (self::nameTokens($type->name) as $token) {
                foreach ($words as $w) {
                    if (str_starts_with($token, $w) || str_starts_with($w, $token)) { $score++; break; }
                }
            }
            if ($score > 0) $hits->push(['score' => $score, 'type' => $type]);
        }
        $best = $hits->max('score');
        return $hits->where('score', $best)->pluck('type')->values();
    }

    private static function nameTokens(string $name): array
    {
        return array_values(array_filter(
            explode(' ', self::norm($name)),
            fn ($w) => mb_strlen($w) >= 4 && ! in_array($w, self::NAME_STOP, true)
        ));
    }

    private static function typeDetail(Collection $types, bool $admin): array
    {
        $blocks = $types->take(4)->map(function (DocumentType $t) {
            $lines = [$t->name];
            if ($t->description) $lines[] = $t->description;
            $lines[] = 'Fee: '.self::peso($t->fee).' per copy · Processing: '.self::days((int) $t->processing_days);
            return implode("\n", $lines);
        })->implode("\n\n");

        return self::say($blocks.($admin ? '' : "\n\nTo get it, open New Request and choose this document."),
            $admin ? [] : [['label' => 'New Request', 'to' => '/new']]);
    }

    private static function documentList(string $intent, bool $admin): array
    {
        $types = DocumentType::where('is_active', true)->orderBy('name')->get();
        if ($types->isEmpty()) return self::say('No document types are available right now. Please check again later or contact the college office.');

        $head = match ($intent) {
            'fees' => 'Fee per copy for each document:',
            'processing' => 'Estimated processing time for each document:',
            default => 'Documents you can request:',
        };
        $lines = $types->map(fn ($t) => '• '.$t->name.' — '.self::peso($t->fee).' per copy · '.self::days((int) $t->processing_days))->implode("\n");

        return self::say($head."\n".$lines."\n\nAsk me about a document by name for its details.",
            $admin ? [['label' => 'Manage document types', 'to' => '/document-types']] : [['label' => 'New Request', 'to' => '/new']]);
    }

    /* ------------------------------------------------------------------ how-to answers */

    private static function howToRequest(bool $admin): array
    {
        if ($admin) {
            return self::say("Students submit requests themselves from the New Request page.\nYou manage them under All Requests: open a request to verify its payment and update its status.",
                [['label' => 'All Requests', 'to' => '/requests']]);
        }
        return self::say("To request a document:\n1. Open New Request.\n2. Choose the document, number of copies and your purpose.\n3. Choose how you will pay (GCash, Bank Transfer or Cash) and who will pick it up.\n4. Submit. You get a transaction number (TXN-…) — keep it.\n\nThen follow it under My Requests. You get a notification every time the status changes.",
            [['label' => 'New Request', 'to' => '/new'], ['label' => 'My Requests', 'to' => '/']]);
    }

    private static function payment(bool $admin): array
    {
        $lines = [
            'You can pay by GCash, Bank Transfer or Cash.',
            '• GCash / Bank Transfer: pay first, then send the reference number or upload your receipt (JPG, PNG or PDF, max 5 MB) when you submit the request or later from the request page. GCash reference: 10–20 digits. Bank reference: 6–40 letters/numbers.',
            '• Cash: pay at the college office. Nothing to upload — the admin records the payment.',
            'The admin checks every payment. A document cannot be set to Ready to pick up or Completed until its payment is Verified.',
        ];

        // Account details the admin entered under Site Settings (only shown when filled in).
        $s = array_map(fn ($v) => trim((string) $v), Setting::allKeyed());
        $extra = [];
        if (($s['gcash_number'] ?? '') !== '') {
            $extra[] = 'GCash: '.trim(($s['gcash_name'] ?? '').' · '.$s['gcash_number'], ' ·');
        }
        if (($s['bank_account_number'] ?? '') !== '') {
            $extra[] = 'Bank: '.implode(' · ', array_filter([$s['bank_name'] ?? '', $s['bank_account_name'] ?? '', $s['bank_account_number']]));
        }
        if (($s['payment_notes'] ?? '') !== '') $extra[] = 'Note: '.$s['payment_notes'];
        if ($extra) $lines[] = "\n".implode("\n", $extra);

        return self::say(implode("\n", $lines), $admin ? [] : [['label' => 'New Request', 'to' => '/new']]);
    }

    private static function paymentVerify(bool $admin): array
    {
        $text = "Payment status meanings:\n• Unpaid — no payment details sent yet.\n• Pending Verification — a reference number/receipt was sent and waits for the admin.\n• Verified — the payment is confirmed.\n• Rejected — the admin could not confirm it; the reason is shown on the request and the details must be sent again.\nCash is marked Verified by the admin once it is paid at the office.";
        if ($admin) {
            $text .= "\n\nTo process one: open the request, then use Verify payment, Reject payment (a reason is required) or Record cash payment.";
            return self::say($text, [['label' => 'All Requests', 'to' => '/requests']]);
        }
        return self::say($text);
    }

    private static function claim(): array
    {
        $steps = collect(preg_split('/\R/u', self::setting('claim_steps')))->map('trim')->filter()->take(8)->values();
        $text = $steps->isEmpty()
            ? 'When your request is Ready to pick up, go to the college office with your transaction number and a valid ID.'
            : "How to claim your document:\n".$steps->map(fn ($s, $i) => ($i + 1).'. '.$s)->implode("\n");
        $text .= "\n\nIf someone else will claim it for you, they must bring your signed authorization letter.";
        if ($hours = self::setting('office_hours')) $text .= "\nOffice hours: ".$hours;

        return self::say($text, [['label' => 'How to Claim', 'to' => '/how-to-claim']]);
    }

    private static function representative(bool $admin): array
    {
        $text = $admin
            ? 'If a student cannot claim the document personally, the person who picks it up must bring the student\'s signed authorization letter. The request page shows the representative\'s name and the letter if one was uploaded.'
            : "If someone else will claim your document, they must bring an authorization letter signed by you.\nWhen you submit the request, choose that someone else will pick it up, enter their name, and (optionally) upload a copy of the letter.";
        return self::say($text, $admin ? [] : [['label' => 'New Request', 'to' => '/new']]);
    }

    private static function contact(): array
    {
        $lines = [];
        foreach (['office_hours' => 'Office hours', 'address' => 'Address', 'contact_phone' => 'Phone', 'contact_email' => 'Email'] as $key => $label) {
            if ($v = self::setting($key)) $lines[] = $label.': '.$v;
        }
        return self::say($lines ? implode("\n", $lines) : 'The college has not posted its contact details yet. Please check the About ACC page later.',
            [['label' => 'About ACC', 'to' => '/about']]);
    }

    private static function cancel(bool $admin): array
    {
        return self::say($admin
            ? 'Students can cancel their own request only while it is Pending. As admin you can change a request\'s status from its page.'
            : "You can cancel a request only while its status is Pending: open the request and choose Cancel (a reason is optional).\nOnce it is past Pending, please contact the college office.",
            $admin ? [['label' => 'All Requests', 'to' => '/requests']] : [['label' => 'My Requests', 'to' => '/']]);
    }

    private static function statuses(): array
    {
        $lines = collect(self::HINTS)->map(fn ($hint, $status) => '• '.$status.' — '.$hint)->implode("\n");
        return self::say("What each request status means:\n".$lines);
    }

    private static function account(): array
    {
        return self::say("Open My Profile to change your profile picture (JPG, PNG or WebP, max 2 MB), your contact details and your password (at least 8 characters, letters and numbers).\nIf you forgot your password, please ask the college office for help.",
            [['label' => 'My Profile', 'to' => '/profile']]);
    }

    private static function help(bool $admin): array
    {
        return self::say($admin
            ? "I'm the ACC Assistant. For admins I can:\n• Show today's figures: pending requests, payments to verify, ready to pick up\n• Look up any request — send me its reference (ACC-2026-00001) or transaction number (TXN-…)\n• Explain statuses, payment verification and document fees\n• Give the office hours and contact details"
            : "I'm the ACC Assistant. I can help with:\n• Documents, fees and processing time\n• How to request a document\n• Payments (GCash, bank, cash) and verification\n• Claiming your document and authorization letters\n• Your requests — send me a reference (ACC-2026-00001) or transaction number (TXN-…)\n• Office hours and contact details");
    }

    private static function fallback(bool $admin): array
    {
        $text = "Sorry, I didn't understand that. Try asking about documents and fees, payments, claiming, or your request status.";
        if ($hours = self::setting('office_hours')) $text .= "\nFor anything else, please visit or contact the college office (".$hours.').';
        return self::say($text);
    }

    /* ------------------------------------------------------------------ requests */

    /** A student's own latest requests. */
    private static function myRequests(User $user): array
    {
        $studentId = $user->student?->id;
        $items = $studentId
            ? DocumentRequest::with('documentType')->where('student_id', $studentId)->latest()->take(5)->get()
            : collect();

        if ($items->isEmpty()) {
            return self::say('You have no document requests yet.', [['label' => 'New Request', 'to' => '/new']]);
        }
        $lines = $items->map(fn ($r) => '• '.$r->reference_number.' — '.($r->documentType?->name ?? 'Document').' — '.$r->status)->implode("\n");
        $ready = $items->where('status', DocumentRequest::READY)->count();

        return self::say("Your latest requests:\n".$lines
            .($ready ? "\n\n".$ready.' of them '.($ready === 1 ? 'is' : 'are').' ready to pick up.' : '')
            ."\n\nSend me a reference or transaction number for the full details.",
            $items->map(fn ($r) => ['label' => $r->reference_number, 'to' => '/requests/'.$r->id])->all());
    }

    /** Full details of ONE request. Students only see their own; admins see all. */
    private static function lookup(array $ref, User $user): array
    {
        [$column, $value] = $ref;
        $admin = $user->role === 'admin';

        $q = DocumentRequest::with(['documentType', 'student.user'])->where($column, $value);
        if (! $admin) $q->where('student_id', $user->student?->id ?? 0);
        $req = $q->first();

        if (! $req) {
            return self::say("I couldn't find a request with that number".($admin ? '.' : ' under your account.')." Please check the number (for example ACC-2026-00001 or TXN-20261007-K7Q2ZP) and try again.");
        }

        $final = in_array($req->status, DocumentRequest::FINAL, true);
        $lines = [
            $req->reference_number.' · '.$req->transaction_number,
            ($req->documentType?->name ?? 'Document').' × '.$req->copies.($admin ? ' — '.($req->student?->user?->name ?? 'student') : ''),
            'Status: '.$req->status,
            'Payment: '.$req->payment_status.($req->payment_method ? ' ('.$req->payment_method.')' : '').' · '.self::peso($req->amount),
            'Submitted: '.$req->created_at?->timezone(config('app.timezone'))->format('M j, Y'),
        ];

        if (! $admin) {
            $lines[] = '';
            $lines[] = self::HINTS[$req->status] ?? '';
            if ($req->status === 'Rejected' && $req->rejection_reason) $lines[] = 'Reason: '.$req->rejection_reason;
            if (! $final) {
                $online = in_array($req->payment_method, DocumentRequest::ONLINE_METHODS, true);
                if ($req->payment_status === 'Rejected') {
                    $lines[] = 'Your payment was rejected'.($req->payment_remarks ? ' ('.$req->payment_remarks.')' : '').'. Open the request and send your reference number or receipt again.';
                } elseif ($req->payment_status === 'Unpaid') {
                    $lines[] = $online
                        ? 'Your payment details are still needed. Open the request and send your reference number or receipt.'
                        : 'Please pay in cash at the college office.';
                } elseif ($req->payment_status === 'Pending Verification') {
                    $lines[] = 'Your payment is waiting for the admin to verify it.';
                }
            }
        }

        return self::say(rtrim(implode("\n", $lines)), [['label' => 'Open request', 'to' => '/requests/'.$req->id]]);
    }

    /** Admin: the same figures as the dashboard, as a short answer. */
    private static function adminStats(): array
    {
        $counts = DocumentRequest::select('status', DB::raw('count(*) as c'))->groupBy('status')->pluck('c', 'status');
        $n = fn (string $s) => (int) ($counts[$s] ?? 0);
        $toVerify = DocumentRequest::where('payment_status', 'Pending Verification')->whereNotIn('status', DocumentRequest::FINAL)->count();
        $today = DocumentRequest::whereDate('created_at', today())->count();

        return self::say(implode("\n", [
            'Requests today: '.$today,
            'Pending: '.$n('Pending'),
            'Under review: '.$n('Under Review'),
            'Approved / Processing: '.($n('Approved') + $n('Processing')),
            'Ready to pick up: '.$n(DocumentRequest::READY),
            'Payments to verify: '.$toVerify,
            'Total requests: '.$counts->sum(),
        ]), [['label' => 'All Requests', 'to' => '/requests'], ['label' => 'Reports', 'to' => '/reports']]);
    }

    /* ------------------------------------------------------------------ quick-reply buttons */

    private static function chips(bool $admin, ?string $intent): array
    {
        if ($admin) {
            return match ($intent) {
                'admin_stats', 'track' => ['Payments to verify', 'How do I verify a payment?', 'What do the statuses mean?'],
                'payment_verify', 'payment' => ['Request summary', 'What do the statuses mean?'],
                default => ['Request summary', 'Payments to verify', 'How do I verify a payment?', 'Office hours'],
            };
        }
        return match ($intent) {
            'documents', 'fees', 'processing' => ['How do I request a document?', 'How do I pay?'],
            'how_to_request' => ['How do I pay?', 'How do I claim my document?'],
            'payment' => ['What does payment verification mean?', 'Can I pay in cash?'],
            'payment_verify' => ['Track my requests', 'How do I pay?'],
            'claim' => ['Can someone else claim for me?', 'Office hours'],
            'representative' => ['How do I claim my document?', 'Office hours'],
            'track' => ['What do the statuses mean?', 'Can I cancel a request?'],
            'statuses', 'cancel' => ['Track my requests', 'How do I claim my document?'],
            default => ['What documents can I request?', 'How do I pay?', 'Track my requests', 'How do I claim my document?'],
        };
    }
}
