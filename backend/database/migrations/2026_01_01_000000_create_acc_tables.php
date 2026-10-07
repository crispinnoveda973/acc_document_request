<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Two roles only: 'admin' and 'student' (the "user").
        Schema::table('users', function (Blueprint $t) {
            $t->string('role', 20)->default('student')->after('password')->index();
            $t->boolean('is_active')->default(true)->after('role');
        });

        Schema::create('students', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('student_number', 30)->unique();
            $t->string('course');
            $t->string('year_level', 20);
            $t->string('contact_number', 30);
            $t->timestamps();
        });

        Schema::create('document_types', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->text('description')->nullable();
            $t->decimal('fee', 8, 2)->default(0);
            $t->unsignedSmallInteger('processing_days')->default(3);
            $t->boolean('is_active')->default(true)->index();
            $t->timestamps();
        });

        Schema::create('document_requests', function (Blueprint $t) {
            $t->id();
            $t->string('reference_number', 20)->unique();
            $t->string('transaction_number', 30)->unique();
            $t->foreignId('student_id')->constrained()->cascadeOnDelete();
            $t->foreignId('document_type_id')->constrained();
            $t->unsignedTinyInteger('copies')->default(1);
            $t->string('purpose');
            $t->date('preferred_claim_date')->nullable();
            $t->string('status', 30)->default('Pending')->index();
            $t->date('pickup_date')->nullable();                       // set by admin when "Ready for Pick-up"
            $t->string('attachment_path')->nullable();
            $t->text('rejection_reason')->nullable();

            // Payment
            $t->decimal('amount', 10, 2)->default(0);
            $t->string('payment_method', 30)->nullable();               // GCash | Bank Transfer
            $t->string('payment_reference', 80)->nullable();
            $t->string('payment_proof_path')->nullable();
            $t->string('payment_status', 20)->default('Unpaid')->index(); // Unpaid | For Verification | Verified

            // Pick-up
            $t->string('pickup_by', 20)->default('self');               // self | representative
            $t->string('representative_name', 120)->nullable();
            $t->string('authorization_letter_path')->nullable();

            $t->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['student_id', 'status']);
        });

        Schema::create('request_status_histories', function (Blueprint $t) {
            $t->id();
            $t->foreignId('document_request_id')->constrained()->cascadeOnDelete();
            $t->string('old_status', 30)->nullable();
            $t->string('new_status', 30);
            $t->text('remarks')->nullable();
            $t->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('notices', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('document_request_id')->nullable()->constrained()->cascadeOnDelete();
            $t->string('message');
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
            $t->index(['user_id', 'read_at']);
        });

        // Editable site content: about text, contact, payment accounts, claim steps, uploaded claim-process files.
        Schema::create('settings', function (Blueprint $t) {
            $t->id();
            $t->string('key', 60)->unique();
            $t->longText('value')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('notices');
        Schema::dropIfExists('request_status_histories');
        Schema::dropIfExists('document_requests');
        Schema::dropIfExists('document_types');
        Schema::dropIfExists('students');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['role', 'is_active']));
    }
};
