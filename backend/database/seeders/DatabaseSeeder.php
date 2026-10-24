<?php

namespace Database\Seeders;

use App\Models\DocumentRequest;
use App\Models\DocumentType;
use App\Models\Setting;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::create(['name' => 'ACC Admin', 'email' => 'admin@acc.edu.ph', 'password' => 'Admin@12345', 'role' => 'admin']);

        // Default site content. The admin can edit all of this under "Site Settings".
        $defaults = [
            'about_text' => "Abuyog Community College (ACC) is a local college in Abuyog, Leyte, Philippines. "
                ."This portal lets students request official school documents online, pay through GCash, bank transfer or cash, "
                ."track the progress of every request, and know exactly when and how to claim their documents.",
            'address' => 'Abuyog, Leyte, Philippines',
            'contact_email' => '',
            'contact_phone' => '',
            'office_hours' => 'Monday to Friday, 8:00 AM - 5:00 PM',
            'claim_steps' => implode("\n", [
                'Submit your request online and keep your transaction number.',
                'Pay the fee through GCash or bank transfer and send your reference number or receipt, or pay in cash at the college office. The admin confirms every payment.',
                'Wait for the admin to approve your request and verify your payment. You will get a notification.',
                'When the status becomes "Ready to pick up", go to the college office to claim your document.',
                'Go to the college office during office hours and present your transaction number and a valid ID.',
                'If someone else will claim the document for you, they must bring your signed authorization letter.',
            ]),
            'payment_notes' => 'Use your transaction number as the payment note / message. Keep your receipt.',
            'gcash_name' => '', 'gcash_number' => '',
            'bank_name' => '', 'bank_account_name' => '', 'bank_account_number' => '',
        ];
        foreach ($defaults as $k => $v) Setting::put($k, $v);

        $types = collect([
            ['Certificate of Enrollment', 'Proof that you are currently enrolled.', 50, 2],
            ['Certificate of Good Moral', 'Certifies good moral character.', 50, 3],
            ['School Certification', 'General school certification.', 50, 3],
            ['Transcript of Records', 'Official academic record.', 150, 7],
            ['Certificate of Grades', 'Grades for a given semester.', 50, 2],
            ['Diploma Copy', 'Certified true copy of diploma.', 100, 5],
        ])->map(fn ($t) => DocumentType::create([
            'name' => $t[0], 'description' => $t[1], 'fee' => $t[2], 'processing_days' => $t[3], 'is_active' => true,
        ]));

        $students = [
            ['Juan Dela Cruz', 'juan@student.acc.edu.ph', '2023-0001', 'BS Information Technology', '3rd Year', '09171234567'],
            ['Ana Reyes', 'ana@student.acc.edu.ph', '2022-0042', 'BS Education', '4th Year', '09181234567'],
            ['Pedro Garcia', 'pedro@student.acc.edu.ph', '2024-0107', 'BS Business Administration', '2nd Year', '09191234567'],
        ];

        $made = [];
        foreach ($students as $s) {
            $u = User::create(['name' => $s[0], 'email' => $s[1], 'password' => 'Student@12345', 'role' => 'student']);
            $made[] = Student::create(['user_id' => $u->id, 'student_number' => $s[2], 'course' => $s[3], 'year_level' => $s[4], 'contact_number' => $s[5]]);
        }

        // [student, type, status, payment method, payment status, pickup_by]
        $samples = [
            [0, 0, 'Pending', 'GCash', 'Unpaid', 'self'],
            [0, 3, 'Under Review', 'Bank Transfer', 'Pending Verification', 'self'],
            [1, 1, 'Approved', 'GCash', 'Verified', 'self'],
            [1, 4, 'Ready to pick up', 'GCash', 'Verified', 'representative'],
            [2, 2, 'Completed', 'Bank Transfer', 'Verified', 'self'],
            [2, 5, 'Rejected', 'GCash', 'Unpaid', 'self'],
            [0, 1, 'Pending', 'Cash', 'Unpaid', 'self'],
            [1, 2, 'Approved', 'GCash', 'Rejected', 'self'],
        ];
        // Spread the sample requests over the last weeks so the day / week / month reports have something to show.
        $daysAgo = [0, 0, 1, 2, 4, 8, 15, 25];
        foreach ($samples as $i => [$si, $ti, $status, $method, $pay, $by]) {
            $req = DocumentRequest::create([
                'reference_number' => DocumentRequest::nextReference(),
                'transaction_number' => DocumentRequest::nextTransaction(),
                'student_id' => $made[$si]->id, 'document_type_id' => $types[$ti]->id,
                'copies' => 1, 'purpose' => 'Employment / scholarship requirement',
                'preferred_claim_date' => now()->addDays(7)->toDateString(), 'status' => 'Pending',
                'amount' => $types[$ti]->fee, 'payment_method' => $method,
                // Realistic sample references that pass the app's validation (GCash: digits, bank: letters/digits). Cash has none.
                'payment_reference' => in_array($pay, ['Unpaid']) || $method === 'Cash' ? null : ($method === 'GCash' ? (string) random_int(1000000000000, 9999999999999) : 'TRF'.random_int(10000000, 99999999)),
                'payment_remarks' => $pay === 'Rejected' ? 'Reference number not found in our records.' : null,
                'payment_status' => $pay,
                'payment_submitted_at' => in_array($pay, ['Unpaid']) || $method === 'Cash' ? null : now(),
                'payment_verified_at' => $pay === 'Verified' ? now() : null,
                'payment_verified_by' => $pay === 'Verified' ? $admin->id : null,
                'pickup_by' => $by, 'representative_name' => $by === 'representative' ? 'Maria Reyes' : null,
            ]);
            if ($daysAgo[$i]) $req->forceFill(['created_at' => now()->subDays($daysAgo[$i])])->saveQuietly();
            $req->histories()->create(['new_status' => 'Pending', 'remarks' => 'Request submitted.', 'changed_by' => $made[$si]->user_id]);
            if ($status !== 'Pending') {
                $req->changeStatus($status, $status === 'Rejected' ? 'Incomplete supporting documents.' : null, $admin->id, true);
            }
        }
    }
}
