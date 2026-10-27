<?php

namespace Tests\Unit;

use App\Support\Chatbot;
use Tests\TestCase;

/** The ACC Assistant: which topic a message is about, and how reference numbers are found. (No database needed.) */
class ChatbotTest extends TestCase
{
    /** @dataProvider messages */
    public function test_detects_the_topic(string $message, ?string $intent): void
    {
        $this->assertSame($intent, Chatbot::detectIntent($message), $message);
    }

    public static function messages(): array
    {
        return [
            'documents' => ['What documents can I request?', 'documents'],
            'fee' => ['How much is the transcript of records?', 'fees'],
            'fee (Filipino)' => ['magkano ang TOR', 'fees'],
            'processing' => ['How many days for good moral?', 'processing'],
            'how to request' => ['How do I request a document?', 'how_to_request'],
            'pay' => ['How do I pay?', 'payment'],
            'pay (Filipino)' => ['paano magbayad', 'payment'],
            'pay for a request' => ['how do i pay for my request', 'payment'],
            'cash' => ['Can I pay in cash?', 'payment'],
            'verification' => ['What does pending verification mean?', 'payment_verify'],
            'claim' => ['How do I claim my document?', 'claim'],
            'ready' => ['is it ready to pick up?', 'claim'],
            'representative' => ['Can someone else claim for me?', 'representative'],
            'hours' => ['What time does the office open? office hours', 'hours_contact'],
            'track' => ['Track my requests', 'track'],
            'status' => ['what is my request status', 'track'],
            'statuses' => ['What do the statuses mean?', 'statuses'],
            'cancel' => ['How do I cancel my request', 'cancel'],
            'account' => ['change my password', 'account'],
            'admin figures' => ['Request summary', 'admin_stats'],
            'admin figures 2' => ['how many requests today?', 'admin_stats'],
            'payments to verify' => ['Payments to verify', 'admin_stats'],
            'thanks' => ['Thank you!', 'thanks'],
            'bye' => ['goodbye', 'bye'],
            'greeting' => ['hello', 'greeting'],
            'help' => ['what can you do', 'help'],
            'greeting + question' => ['hello, how do i pay', 'payment'],
            'nonsense' => ['asdfgh', null],
        ];
    }

    public function test_finds_reference_and_transaction_numbers(): void
    {
        $this->assertSame(['reference_number', 'ACC-2026-00007'], Chatbot::extractReference('status of acc-2026-00007 please'));
        $this->assertSame(['reference_number', 'ACC-2026-00007'], Chatbot::extractReference('ACC 2026 00007'));
        $this->assertSame(['transaction_number', 'TXN-20261007-K7Q2ZP'], Chatbot::extractReference('my txn is TXN-20261007-k7q2zp'));
        $this->assertNull(Chatbot::extractReference('where is my request'));
        $this->assertNull(Chatbot::extractReference("ACC-2026-1' OR 1=1 --"));   // not a valid number: nothing is looked up
    }
}
