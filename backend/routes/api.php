<?php

use App\Http\Controllers\Api\AdminRequestController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DocumentTypeController;
use App\Http\Controllers\Api\NoticeController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StudentRequestController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::get('/info', [SettingsController::class, 'info']);   // public: About ACC on the login page

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/password', [AuthController::class, 'changePassword']);

    Route::get('/document-types', [DocumentTypeController::class, 'index']);
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::get('/notices', [NoticeController::class, 'index']);
    Route::post('/notices/read', [NoticeController::class, 'markAllRead']);

    // ---- Student (the "user") ----
    Route::middleware('role:student')->prefix('student')->group(function () {
        Route::get('/requests', [StudentRequestController::class, 'index']);
        Route::post('/requests', [StudentRequestController::class, 'store']);
        Route::get('/requests/{documentRequest}', [StudentRequestController::class, 'show']);
        Route::post('/requests/{documentRequest}/cancel', [StudentRequestController::class, 'cancel']);
        Route::post('/requests/{documentRequest}/payment', [StudentRequestController::class, 'pay']);
    });

    // ---- Admin ----
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/stats', [AdminRequestController::class, 'stats']);
        Route::get('/requests', [AdminRequestController::class, 'index']);
        Route::get('/requests/{id}', [AdminRequestController::class, 'show']);
        Route::put('/requests/{id}', [AdminRequestController::class, 'update']);
        Route::patch('/requests/{id}/status', [AdminRequestController::class, 'updateStatus']);
        Route::patch('/requests/{id}/payment', [AdminRequestController::class, 'updatePayment']);
        Route::post('/requests/{id}/remarks', [AdminRequestController::class, 'addRemark']);
        Route::post('/requests/{id}/restore', [AdminRequestController::class, 'restore']);
        Route::delete('/requests/{id}', [AdminRequestController::class, 'destroy']);

        Route::post('/document-types', [DocumentTypeController::class, 'store']);
        Route::put('/document-types/{documentType}', [DocumentTypeController::class, 'update']);
        Route::delete('/document-types/{documentType}', [DocumentTypeController::class, 'destroy']);

        Route::put('/settings', [SettingsController::class, 'update']);
        Route::post('/settings/claim-files', [SettingsController::class, 'uploadClaimFile']);
        Route::delete('/settings/claim-files/{index}', [SettingsController::class, 'deleteClaimFile'])->whereNumber('index');
    });
});
