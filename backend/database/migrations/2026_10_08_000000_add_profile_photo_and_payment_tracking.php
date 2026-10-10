<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds:
 *  - users.profile_photo_path          -> profile picture (students and admins), stored on the "public" disk
 *  - document_requests.payment_*       -> when payment details were sent / verified, and which admin verified them
 *
 * This is a separate migration, so an existing database only needs `php artisan migrate`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('profile_photo_path')->nullable()->after('is_active');
        });

        Schema::table('document_requests', function (Blueprint $t) {
            $t->timestamp('payment_submitted_at')->nullable()->after('payment_status');
            $t->timestamp('payment_verified_at')->nullable()->after('payment_submitted_at');
            $t->foreignId('payment_verified_by')->nullable()->after('payment_verified_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('document_requests', function (Blueprint $t) {
            $t->dropConstrainedForeignId('payment_verified_by');
            $t->dropColumn(['payment_submitted_at', 'payment_verified_at']);
        });
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('profile_photo_path'));
    }
};
