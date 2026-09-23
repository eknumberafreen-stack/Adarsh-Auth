#pragma once

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <wininet.h>
#include <bcrypt.h>
#include <string>
#include <vector>
#include <iostream>
#include <sstream>
#include <chrono>
#include <iomanip>
#include <algorithm>

#pragma comment(lib, "wininet.lib")
#pragma comment(lib, "bcrypt.lib")
#pragma comment(lib, "advapi32.lib")

namespace AdarshAuth {

    struct user_data_class {
        std::string username;
        std::string ip;
        std::string hwid;
        std::string createdate;
        std::string lastlogin;
        std::string subscription;
        std::string expiry;
    };

    struct app_data_class {
        std::string version = "1.0";
    };

    struct response_class {
        bool success = false;
        std::string message;
    };

    class api {
    public:
        std::string name;
        std::string ownerid;
        std::string secret;
        std::string version;
        std::string url;

        user_data_class user_data;
        app_data_class app_data;
        response_class response;

        std::string session_token;
        bool initialized = false;

        api(std::string name, std::string ownerid, std::string secret, std::string version, std::string url = "https://adarshauth.store/api/client")
            : name(name), ownerid(ownerid), secret(secret), version(version), url(url) {
            app_data.version = version;
        }

        bool init() {
            std::string res = post_request("/init", "{}");
            response.success = parse_bool(res, "success");
            response.message = parse_string(res, "message");

            if (response.success) {
                initialized = true;
                std::string server_ver = parse_string(res, "version");
                if (!server_ver.empty()) app_data.version = server_ver;
                return true;
            }
            return false;
        }

        bool login(const std::string& username, const std::string& password) {
            check_init();
            std::string hwid = get_hwid();
            std::string extra = "{\"username\":\"" + escape_json(username) + "\",\"password\":\"" + escape_json(password) + "\",\"hwid\":\"" + hwid + "\"}";
            
            std::string res = post_request("/login", extra);
            response.success = parse_bool(res, "success");
            response.message = parse_string(res, "message");

            if (response.success) {
                load_user(res, hwid);
                return true;
            }
            return false;
        }

        bool regstr(const std::string& username, const std::string& password, const std::string& license_key) {
            check_init();
            std::string hwid = get_hwid();
            std::string extra = "{\"username\":\"" + escape_json(username) + "\",\"password\":\"" + escape_json(password) + "\",\"license_key\":\"" + escape_json(license_key) + "\",\"hwid\":\"" + hwid + "\"}";

            std::string res = post_request("/register", extra);
            response.success = parse_bool(res, "success");
            response.message = parse_string(res, "message");

            if (response.success) {
                load_user(res, hwid);
                return true;
            }
            return false;
        }

        bool license(const std::string& license_key) {
            check_init();
            std::string hwid = get_hwid();
            std::string extra = "{\"key\":\"" + escape_json(license_key) + "\",\"hwid\":\"" + hwid + "\"}";

            std::string res = post_request("/license", extra);
            response.success = parse_bool(res, "success");
            response.message = parse_string(res, "message");

            if (response.success) {
                load_user(res, hwid);
                return true;
            }
            return false;
        }

        bool check() {
            check_init();
            if (session_token.empty()) {
                response.success = false;
                response.message = "No active session.";
                return false;
            }
            std::string hwid = get_hwid();
            std::string extra = "{\"session_token\":\"" + session_token + "\",\"hwid\":\"" + hwid + "\"}";

            std::string res = post_request("/validate", extra);
            response.success = parse_bool(res, "success");
            response.message = parse_string(res, "message");

            if (response.success) {
                load_user(res, hwid);
                return true;
            }
            session_token.clear();
            return false;
        }

        std::string var(const std::string& varid) {
            check_init();
            std::string extra = "{\"varid\":\"" + escape_json(varid) + "\",\"session_token\":\"" + session_token + "\"}";
            std::string res = post_request("/var", extra);
            return parse_string(res, "value");
        }

        void log(const std::string& message) {
            check_init();
            std::string extra = "{\"message\":\"" + escape_json(message) + "\",\"session_token\":\"" + session_token + "\"}";
            post_request("/log", extra);
        }

        static std::string get_hwid() {
            HW_PROFILE_INFOA hwProfileInfo;
            if (GetCurrentHwProfileA(&hwProfileInfo)) {
                std::string guid = hwProfileInfo.szHwProfileGuid;
                if (!guid.empty()) return guid;
            }
            char compName[MAX_COMPUTERNAME_LENGTH + 1];
            DWORD size = sizeof(compName);
            if (GetComputerNameA(compName, &size)) {
                return std::string(compName);
            }
            return "UNKNOWN_CPP_DEVICE";
        }

    private:
        void check_init() {
            if (!initialized) {
                std::cerr << "[AdarshAuth] Error: You must call init() first." << std::endl;
            }
        }

        void load_user(const std::string& res, const std::string& hwid) {
            session_token = parse_string(res, "sessionToken");
            if (session_token.empty()) session_token = parse_string(res, "session_token");

            user_data.username = parse_string(res, "username");
            user_data.ip = parse_string(res, "ip");
            user_data.hwid = hwid;
            user_data.createdate = parse_string(res, "createdate");
            user_data.lastlogin = parse_string(res, "lastlogin");
            user_data.subscription = parse_string(res, "subscription");
            if (user_data.subscription.empty()) user_data.subscription = "default";
            user_data.expiry = parse_string(res, "expiryDate");
            if (user_data.expiry.empty()) user_data.expiry = parse_string(res, "expiry");
            if (user_data.expiry.empty()) user_data.expiry = "Lifetime";
        }

        std::string post_request(const std::string& endpoint, const std::string& extra_json) {
            auto now = std::chrono::system_clock::now();
            long long timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
            std::string nonce = generate_nonce(16);

            // Compute HMAC-SHA256 signature if secret is present
            std::string data_to_sign = name + ownerid + std::to_string(timestamp) + nonce + extra_json;
            std::string signature = secret.empty() ? "" : hmac_sha256(secret, data_to_sign);

            // Construct complete JSON body
            std::string body = "{";
            body += "\"app_name\":\"" + escape_json(name) + "\",";
            body += "\"owner_id\":\"" + escape_json(ownerid) + "\",";
            body += "\"timestamp\":" + std::to_string(timestamp) + ",";
            body += "\"nonce\":\"" + nonce + "\",";
            body += "\"signature\":\"" + signature + "\",";
            body += "\"version\":\"" + escape_json(version) + "\"";

            if (extra_json.size() > 2) {
                // extra_json is "{...}", strip outer braces and merge
                std::string inner = extra_json.substr(1, extra_json.size() - 2);
                body += "," + inner;
            }
            body += "}";

            return http_post(url + endpoint, body);
        }

        static std::string generate_nonce(size_t len) {
            static const char chars[] = "0123456789abcdef";
            std::string result;
            result.reserve(len * 2);
            for (size_t i = 0; i < len * 2; ++i) {
                result += chars[rand() % 16];
            }
            return result;
        }

        static std::string hmac_sha256(const std::string& key, const std::string& data) {
            BCRYPT_ALG_HANDLE hAlg = NULL;
            BCRYPT_HASH_HANDLE hHash = NULL;
            std::string hexResult = "";

            if (BCryptOpenAlgorithmProvider(&hAlg, BCRYPT_SHA256_ALGORITHM, NULL, BCRYPT_ALG_HANDLE_HMAC_FLAG) >= 0) {
                if (BCryptCreateHash(hAlg, &hHash, NULL, 0, (PUCHAR)key.c_str(), (ULONG)key.length(), 0) >= 0) {
                    if (BCryptHashData(hHash, (PUCHAR)data.c_str(), (ULONG)data.length(), 0) >= 0) {
                        BYTE hash[32];
                        if (BCryptFinishHash(hHash, hash, sizeof(hash), 0) >= 0) {
                            std::stringstream ss;
                            for (int i = 0; i < 32; i++) {
                                ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
                            }
                            hexResult = ss.str();
                        }
                    }
                    BCryptDestroyHash(hHash);
                }
                BCryptCloseAlgorithmProvider(hAlg, 0);
            }
            return hexResult;
        }

        static std::string escape_json(const std::string& s) {
            std::string res;
            for (char c : s) {
                if (c == '"') res += "\\\"";
                else if (c == '\\') res += "\\\\";
                else if (c == '\n') res += "\\n";
                else if (c == '\r') res += "\\r";
                else res += c;
            }
            return res;
        }

        static std::string http_post(const std::string& full_url, const std::string& json_data) {
            std::string response;
            HINTERNET hInternet = InternetOpenA("AdarshAuth-CPP/1.0", INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
            if (!hInternet) return "{\"success\":false,\"message\":\"Failed to open internet connection.\"}";

            // Parse URL
            char host[256] = {0};
            char path[1024] = {0};
            URL_COMPONENTSA urlComp = {0};
            urlComp.dwStructSize = sizeof(urlComp);
            urlComp.lpszHostName = host;
            urlComp.dwHostNameLength = sizeof(host);
            urlComp.lpszUrlPath = path;
            urlComp.dwUrlPathLength = sizeof(path);

            if (!InternetCrackUrlA(full_url.c_str(), (DWORD)full_url.length(), 0, &urlComp)) {
                InternetCloseHandle(hInternet);
                return "{\"success\":false,\"message\":\"Invalid API URL.\"}";
            }

            INTERNET_PORT port = urlComp.nPort;
            DWORD flags = (urlComp.nScheme == INTERNET_SCHEME_HTTPS) ? (INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE) : INTERNET_FLAG_RELOAD;

            HINTERNET hConnect = InternetConnectA(hInternet, host, port, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
            if (!hConnect) {
                InternetCloseHandle(hInternet);
                return "{\"success\":false,\"message\":\"Failed to connect to host.\"}";
            }

            HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", path, NULL, NULL, NULL, flags, 0);
            if (!hRequest) {
                InternetCloseHandle(hConnect);
                InternetCloseHandle(hInternet);
                return "{\"success\":false,\"message\":\"Failed to create HTTP request.\"}";
            }

            std::string headers = "Content-Type: application/json\r\nAccept: application/json\r\n";
            BOOL sent = HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), (LPVOID)json_data.c_str(), (DWORD)json_data.length());

            if (sent) {
                char buffer[4096];
                DWORD bytesRead = 0;
                while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
                    buffer[bytesRead] = '\0';
                    response.append(buffer, bytesRead);
                }
            } else {
                response = "{\"success\":false,\"message\":\"Failed to send HTTP request.\"}";
            }

            InternetCloseHandle(hRequest);
            InternetCloseHandle(hConnect);
            InternetCloseHandle(hInternet);
            return response;
        }

        static std::string parse_string(const std::string& json, const std::string& key) {
            std::string target = "\"" + key + "\":";
            size_t pos = json.find(target);
            if (pos == std::string::npos) return "";

            pos += target.length();
            while (pos < json.length() && (json[pos] == ' ' || json[pos] == '\t')) pos++;

            if (pos < json.length() && json[pos] == '"') {
                pos++;
                size_t end = json.find('"', pos);
                if (end != std::string::npos) {
                    return json.substr(pos, end - pos);
                }
            }
            return "";
        }

        static bool parse_bool(const std::string& json, const std::string& key) {
            std::string target = "\"" + key + "\":";
            size_t pos = json.find(target);
            if (pos == std::string::npos) return false;

            pos += target.length();
            while (pos < json.length() && (json[pos] == ' ' || json[pos] == '\t')) pos++;

            if (json.compare(pos, 4, "true") == 0) return true;
            return false;
        }
    };
}
