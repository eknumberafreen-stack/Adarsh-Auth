/**
 * AdarshAuth C++ Example
 * Compile: g++ example.cpp -o example -lcurl -lssl -lcrypto -std=c++17
 */

#include "keyauth.hpp"
#include <iostream>

// ── Get Hardware ID (Windows) ─────────────────────────────────────────────────
#ifdef _WIN32
#include <windows.h>
#include <intrin.h>
std::string get_hwid() {
    int cpu[4] = {};
    __cpuid(cpu, 1);
    char buf[64];
    snprintf(buf, sizeof(buf), "%08X%08X", cpu[0], cpu[3]);
    return std::string(buf);
}
#else
#include <fstream>
std::string get_hwid() {
    std::ifstream f("/etc/machine-id");
    std::string id;
    std::getline(f, id);
    return id.empty() ? "UNKNOWN" : id;
}
#endif

int main() {
    // ── Setup credentials ─────────────────────────────────────────────────────
    KeyAuth::api auth(
        "Adarsh Internal",                                                          // App name
        "c0b5729a55347ef1854c9beb32041cca",                                         // Owner ID
        "87b81e1eba8b821d8f38704e3ab32420cd442c67c354b2e265dc7741a7840907a"
        "52712d8160241db17bd5bd644af95b068d04e5904330eb98972f30e95323985",          // App secret
        "1.0.0"                                                                     // Version
    );

    // ── Initialize ────────────────────────────────────────────────────────────
    std::cout << "Initializing..." << std::endl;
    auth.init();
    std::cout << "Connected: " << auth.response.message << std::endl;

    // ── Get HWID ──────────────────────────────────────────────────────────────
    std::string hwid = get_hwid();
    std::cout << "HWID: " << hwid << std::endl;

    // ── Login ─────────────────────────────────────────────────────────────────
    std::string username, password;
    std::cout << "Username: "; std::cin >> username;
    std::cout << "Password: "; std::cin >> password;

    auth.login(username, password, hwid);

    if (auth.response.success) {
        std::cout << "Login successful! Welcome, " << username << std::endl;
        std::cout << "Expiry: " << auth.response.expiry_date << std::endl;
    } else {
        std::cout << "Login failed: " << auth.response.message << std::endl;
        return 1;
    }

    // ── Your protected code here ──────────────────────────────────────────────
    std::cout << "Access granted. Running protected software..." << std::endl;

    return 0;
}
