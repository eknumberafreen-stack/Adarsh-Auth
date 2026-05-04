#pragma once
/**
 * AdarshAuth C++ Client SDK
 * Drop-in replacement — same API as KeyAuth
 *
 * Usage:
 *   KeyAuth::api KeyAuthApp("App Name", "ownerid", "secret", "1.0.0");
 *   KeyAuthApp.init();
 *   KeyAuthApp.login("username", "password", hwid);
 */

#include <chrono>
#include <iomanip>
#include <iostream>
#include <map>
#include <random>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>


// ── Requires: libcurl + OpenSSL ──────────────────────────────────────────────
// Link with: -lcurl -lssl -lcrypto
#include <curl/curl.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>


// ── nlohmann/json (header-only) ──────────────────────────────────────────────
// Download from: https://github.com/nlohmann/json
#include <nlohmann/json.hpp>
using json = nlohmann::json;

namespace KeyAuth {

// ─── Helpers ─────────────────────────────────────────────────────────────────

static std::string to_hex(const unsigned char *data, size_t len) {
  std::ostringstream oss;
  for (size_t i = 0; i < len; i++)
    oss << std::hex << std::setw(2) << std::setfill('0') << (int)data[i];
  return oss.str();
}

static std::string hmac_sha256(const std::string &key, const std::string &msg) {
  unsigned char digest[EVP_MAX_MD_SIZE];
  unsigned int digest_len = 0;
  HMAC(EVP_sha256(), key.c_str(), (int)key.size(),
       (const unsigned char *)msg.c_str(), msg.size(), digest, &digest_len);
  return to_hex(digest, digest_len);
}

static std::string generate_nonce(size_t len = 16) {
  static const char hex_chars[] = "0123456789abcdef";
  std::random_device rd;
  std::mt19937 gen(rd());
  std::uniform_int_distribution<> dis(0, 15);
  std::string nonce;
  nonce.reserve(len);
  for (size_t i = 0; i < len; i++)
    nonce += hex_chars[dis(gen)];
  return nonce;
}

static long long now_ms() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(
             std::chrono::system_clock::now().time_since_epoch())
      .count();
}

static size_t write_callback(void *contents, size_t size, size_t nmemb,
                             std::string *out) {
  out->append((char *)contents, size * nmemb);
  return size * nmemb;
}

// ─── Result struct
// ────────────────────────────────────────────────────────────

struct ApiResult {
  bool success = false;
  std::string message;
  std::string session_token;
  std::string expiry_date;
  bool banned = false;
};

// ─── User / App data
// ──────────────────────────────────────────────────────────

struct UserData {
  std::string username;
  std::string expiry;
  std::string hwid;
  std::string ip;
  std::string createdate;
  std::string lastlogin;
};

struct AppData {
  std::string numUsers;
  std::string numKeys;
  std::string version;
  std::string customerPanelLink;
};

// ─── Main API class
// ───────────────────────────────────────────────────────────

class api {
public:
  // ── Credentials ──────────────────────────────────────────────────────────
  std::string name;
  std::string ownerid;
  std::string secret;
  std::string version;

  UserData user_data;
  AppData app_data;
  ApiResult response;

  // ── Constructor ───────────────────────────────────────────────────────────
  api(const std::string &name, const std::string &ownerid,
      const std::string &secret, const std::string &version)
      : name(name), ownerid(ownerid), secret(secret), version(version),
        _initialized(false) {}

  // ── init() ────────────────────────────────────────────────────────────────
  void init() {
    if (_initialized)
      return;
    auto result = post_signed("/init", {});
    if (!result.success) {
      std::string msg = result.message.empty() ? "Application not found or is paused. Check your credentials." : result.message;
      error(msg);
      exit(0);
    }
    _initialized = true;
    response = result;
  }

  // ── login() ───────────────────────────────────────────────────────────────
  void login(const std::string &username, const std::string &password,
             const std::string &hwid) {
    check_init();
    auto result = post_signed(
        "/login",
        {{"username", username}, {"password", password}, {"hwid", hwid}});
    response = result;
    if (result.success) {
      _session_token = result.session_token;
      user_data.username = username;
      user_data.expiry = result.expiry_date;
      user_data.hwid = hwid;
    }
  }

  // ── register() ────────────────────────────────────────────────────────────
  void register_user(const std::string &username, const std::string &password,
                     const std::string &license_key, const std::string &hwid,
                     const std::string &email = "") {
    check_init();
    auto result = post_signed("/register", {{"username", username},
                                            {"password", password},
                                            {"license_key", license_key},
                                            {"hwid", hwid},
                                            {"email", email}});
    response = result;
    if (result.success) {
      _session_token = result.session_token;
    }
  }

  // ── license() ─────────────────────────────────────────────────────────────
  void license(const std::string &key, const std::string &hwid) {
    check_init();
    response = post_signed("/license", {{"license_key", key}, {"hwid", hwid}});
  }

  // ── check() ───────────────────────────────────────────────────────────────
  void check() {
    check_init();
    response = post_signed("/validate", {{"session_token", _session_token}});
  }

  // ── logout() ──────────────────────────────────────────────────────────────
  void logout() {
    _session_token.clear();
    _initialized = false;
  }

  // ── error() ───────────────────────────────────────────────────────────────
  static void error(const std::string &msg) {
    std::cerr << "[AdarshAuth Error] " << msg << std::endl;
  }

private:
  std::string _session_token;
  bool _initialized;

  // ── Server URL ────────────────────────────────────────────────────────────
  // Change this to your deployed server URL
  const std::string API_BASE = "http://localhost:5000/api/client";

  void check_init() {
    if (!_initialized) {
      error("You must call init() first.");
      exit(0);
    }
  }

  ApiResult post_signed(const std::string &endpoint,
                        std::map<std::string, std::string> payload) {
    long long ts = now_ms();
    std::string nonce = generate_nonce();

    // Build body JSON (payload only, no security fields yet)
    json body_json = payload;
    std::string body_str = body_json.dump();

    // Signature = HMAC_SHA256(secret, name + ownerid + ts + nonce + body)
    std::string data_to_sign =
        name + ownerid + std::to_string(ts) + nonce + body_str;
    std::string signature = hmac_sha256(secret, data_to_sign);

    // Full request payload
    json full;
    for (auto &[k, v] : payload)
      full[k] = v;
    full["app_name"] = name;
    full["owner_id"] = ownerid;
    full["timestamp"] = ts;
    full["nonce"] = nonce;
    full["signature"] = signature;

    std::string request_body = full.dump();
    std::string response_str;

    CURL *curl = curl_easy_init();
    if (!curl)
      return {false, "curl init failed"};

    struct curl_slist *headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    headers = curl_slist_append(headers, "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");

    curl_easy_setopt(curl, CURLOPT_URL, (API_BASE + endpoint).c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, request_body.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response_str);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);

    CURLcode res = curl_easy_perform(curl);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK)
      return {false,
              "Connection failed: " + std::string(curl_easy_strerror(res))};

    return parse_response(response_str);
  }

  ApiResult parse_response(const std::string &raw) {
    try {
      auto j = json::parse(raw);
      ApiResult r;
      r.success = j.value("success", false);
      r.message = j.value("message", "");
      r.session_token = j.value("sessionToken", "");
      r.expiry_date = j.value("expiryDate", "");
      r.banned = j.value("banned", false);
      return r;
    } catch (...) {
      return {false, "Invalid server response"};
    }
  }
};

} // namespace KeyAuth
