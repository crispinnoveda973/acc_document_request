<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * - Payment status "For Verification" is now called "Pending Verification"; payments can also be "Rejected".
 * - Request status "Ready for Pick-up" is now "Ready to pick up" (no date is shown any more).
 * - students.year_level_checked_sy: the school year in which the student last answered the yearly year-level question.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('document_requests')->where('payment_status', 'For Verification')->update(['payment_status' => 'Pending Verification']);

        DB::table('document_requests')->where('status', 'Ready for Pick-up')->update(['status' => 'Ready to pick up']);
        DB::table('request_status_histories')->where('old_status', 'Ready for Pick-up')->update(['old_status' => 'Ready to pick up']);
        DB::table('request_status_histories')->where('new_status', 'Ready for Pick-up')->update(['new_status' => 'Ready to pick up']);

        Schema::table('document_requests', function (Blueprint $t) {
            $t->string('payment_status', 24)->default('Unpaid')->change();
            $t->text('payment_remarks')->nullable()->after('payment_verified_by');   // admin's reason when a payment is rejected
        });

        Schema::table('students', function (Blueprint $t) {
            $t->string('year_level_checked_sy', 9)->nullable()->after('year_level');   // e.g. "2026-2027"
        });
    }

    public function down(): void
    {
        Schema::table('students', fn (Blueprint $t) => $t->dropColumn('year_level_checked_sy'));
        Schema::table('document_requests', fn (Blueprint $t) => $t->dropColumn('payment_remarks'));
        DB::table('document_requests')->where('payment_status', 'Pending Verification')->update(['payment_status' => 'For Verification']);
        DB::table('document_requests')->where('payment_status', 'Rejected')->update(['payment_status' => 'Unpaid']);
        DB::table('document_requests')->where('status', 'Ready to pick up')->update(['status' => 'Ready for Pick-up']);
        DB::table('request_status_histories')->where('old_status', 'Ready to pick up')->update(['old_status' => 'Ready for Pick-up']);
        DB::table('request_status_histories')->where('new_status', 'Ready to pick up')->update(['new_status' => 'Ready for Pick-up']);
    }
};
