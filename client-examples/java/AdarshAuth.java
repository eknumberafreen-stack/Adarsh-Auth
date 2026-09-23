package com.adarshauth;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * ================================================================
 *   AdarshAuth — Java & Android Authentication SDK
 *   Zero-dependency, standalone, production-grade client
 *   Dashboard: https://adarshauth.store
 * ================================================================
 */
public class AdarshAuth {
    private static final String DEFAULT_API_BASE = "https://adarshauth.store/api/client";

    private final String appName;
    private final String ownerId;
    private final String appSecret;
    private final String version;
    private final String apiBase;

    private String sessionToken;
    private boolean initialized = false;
    public UserData userData = new UserData();
    public AppData appData = new AppData();
    public ResponseData response = new ResponseData();

    public static class UserData {
        public String username = "";
        public String ip = "";
        public String hwid = "";
        public String createdate = "";
        public String lastlogin = "";
        public String subscription = "default";
        public String expiryDate = "Lifetime";
        public int activeSessions = 1;
    }

    public static class AppData {
        public String version = "1.0";
    }

    public static class ResponseData {
        public boolean success = false;
        public String message = "";
    }

    public AdarshAuth(String appName, String ownerId, String appSecret, String version) {
        this(appName, ownerId, appSecret, version, DEFAULT_API_BASE);
    }

    public AdarshAuth(String appName, String ownerId, String appSecret, String version, String apiBase) {
        if (appName == null || appName.trim().isEmpty() || ownerId == null || ownerId.trim().isEmpty()) {
            throw new IllegalArgumentException("Application name and Owner ID cannot be empty.");
        }
        this.appName = appName.trim();
        this.ownerId = ownerId.trim();
        this.appSecret = appSecret != null ? appSecret.trim() : "";
        this.version = (version != null && !version.trim().isEmpty()) ? version.trim() : "1.0";
        this.apiBase = (apiBase != null && !apiBase.trim().isEmpty()) ? apiBase.trim().replaceAll("/+$", "") : DEFAULT_API_BASE;
        this.appData.version = this.version;
    }

    public boolean init() {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            SimpleJson res = postRequest("/init", payload);
            response.success = res.getBoolean("success", false);
            response.message = res.getString("message", "Unknown error");

            if (response.success) {
                this.initialized = true;
                this.appData.version = res.getString("version", this.version);
                return true;
            }
            return false;
        } catch (Exception e) {
            response.success = false;
            response.message = e.getMessage();
            return false;
        }
    }

    public void checkInit() {
        if (!initialized) {
            throw new IllegalStateException("You must call AdarshAuth.init() before attempting authentication.");
        }
    }

    public boolean login(String username, String password) {
        checkInit();
        try {
            String hwid = getHWID();
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("username", username);
            payload.put("password", password);
            payload.put("hwid", hwid);

            SimpleJson res = postRequest("/login", payload);
            response.success = res.getBoolean("success", false);
            response.message = res.getString("message", "");

            if (response.success) {
                loadUserData(res, hwid);
                return true;
            }
            return false;
        } catch (Exception e) {
            response.success = false;
            response.message = e.getMessage();
            return false;
        }
    }

    public boolean register(String username, String password, String licenseKey) {
        checkInit();
        try {
            String hwid = getHWID();
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("username", username);
            payload.put("password", password);
            payload.put("license_key", licenseKey);
            payload.put("hwid", hwid);

            SimpleJson res = postRequest("/register", payload);
            response.success = res.getBoolean("success", false);
            response.message = res.getString("message", "");

            if (response.success) {
                loadUserData(res, hwid);
                return true;
            }
            return false;
        } catch (Exception e) {
            response.success = false;
            response.message = e.getMessage();
            return false;
        }
    }

    public boolean upgrade(String username, String licenseKey) {
        checkInit();
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("username", username);
            payload.put("license_key", licenseKey);

            SimpleJson res = postRequest("/upgrade", payload);
            response.success = res.getBoolean("success", false);
            response.message = res.getString("message", "");
            return response.success;
        } catch (Exception e) {
            response.success = false;
            response.message = e.getMessage();
            return false;
        }
    }

    public boolean license(String licenseKey) {
        checkInit();
        try {
            String hwid = getHWID();
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("key", licenseKey);
            payload.put("hwid", hwid);

            SimpleJson res = postRequest("/license", payload);
            response.success = res.getBoolean("success", false);
            response.message = res.getString("message", "");

            if (response.success) {
                loadUserData(res, hwid);
                return true;
            }
            return false;
        } catch (Exception e) {
            response.success = false;
            response.message = e.getMessage();
            return false;
        }
    }

    public boolean check() {
        checkInit();
        if (sessionToken == null || sessionToken.isEmpty()) {
            response.success = false;
            response.message = "No active session.";
            return false;
        }
        try {
            String hwid = getHWID();
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("session_token", sessionToken);
            payload.put("hwid", hwid);

            SimpleJson res = postRequest("/validate", payload);
            response.success = res.getBoolean("success", false);
            response.message = res.getString("message", "");
            if (response.success) {
                loadUserData(res, hwid);
                return true;
            }
            sessionToken = null;
            return false;
        } catch (Exception e) {
            response.success = false;
            response.message = e.getMessage();
            return false;
        }
    }

    public String var(String varId) {
        checkInit();
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("varid", varId);
            payload.put("session_token", sessionToken != null ? sessionToken : "");

            SimpleJson res = postRequest("/var", payload);
            return res.getString("value", null);
        } catch (Exception e) {
            return null;
        }
    }

    public void log(String message) {
        checkInit();
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("message", message);
            payload.put("session_token", sessionToken != null ? sessionToken : "");
            postRequest("/log", payload);
        } catch (Exception ignored) {}
    }

    public void logout() {
        this.sessionToken = null;
        this.initialized = false;
        this.response.success = true;
        this.response.message = "Logged out successfully.";
    }

    public String getSessionToken() {
        return sessionToken;
    }

    private void loadUserData(SimpleJson res, String hwid) {
        this.sessionToken = res.getString("sessionToken", res.getString("session_token", ""));
        this.userData.username = res.getString("username", "");
        this.userData.ip = res.getString("ip", "");
        this.userData.hwid = res.getString("hwid", hwid);
        this.userData.createdate = res.getString("createdate", "");
        this.userData.lastlogin = res.getString("lastlogin", "");
        this.userData.subscription = res.getString("subscription", "default");
        this.userData.expiryDate = res.getString("expiryDate", res.getString("expiry", "Lifetime"));
        this.userData.activeSessions = res.getInt("activeSessions", 1);
    }

    public static String getHWID() {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append(System.getProperty("os.name", ""));
            sb.append(System.getProperty("os.arch", ""));
            sb.append(System.getProperty("user.name", ""));
            sb.append(System.getenv("PROCESSOR_IDENTIFIER") != null ? System.getenv("PROCESSOR_IDENTIFIER") : "");
            sb.append(System.getenv("COMPUTERNAME") != null ? System.getenv("COMPUTERNAME") : "");

            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString();
        }
    }

    private SimpleJson postRequest(String endpoint, Map<String, Object> extraPayload) throws Exception {
        long timestamp = System.currentTimeMillis();
        String nonce = UUID.randomUUID().toString().replace("-", "");

        // Build sorted JSON string for HMAC signature
        Map<String, Object> sortedMap = new TreeMap<>(extraPayload);
        StringBuilder sortedJsonSb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : sortedMap.entrySet()) {
            if (!first) sortedJsonSb.append(",");
            first = false;
            sortedJsonSb.append("\"").append(entry.getKey()).append("\":");
            if (entry.getValue() instanceof Number || entry.getValue() instanceof Boolean) {
                sortedJsonSb.append(entry.getValue());
            } else {
                sortedJsonSb.append("\"").append(escapeJson(String.valueOf(entry.getValue()))).append("\"");
            }
        }
        sortedJsonSb.append("}");

        String dataToSign = appName + ownerId + timestamp + nonce + sortedJsonSb.toString();
        String signature = (appSecret != null && !appSecret.isEmpty()) ? calculateHMAC(dataToSign, appSecret) : "";

        // Build full request body
        Map<String, Object> fullPayload = new LinkedHashMap<>(extraPayload);
        fullPayload.put("app_name", appName);
        fullPayload.put("owner_id", ownerId);
        fullPayload.put("timestamp", timestamp);
        fullPayload.put("nonce", nonce);
        fullPayload.put("signature", signature);
        fullPayload.put("version", version);

        StringBuilder jsonBody = new StringBuilder("{");
        first = true;
        for (Map.Entry<String, Object> entry : fullPayload.entrySet()) {
            if (!first) jsonBody.append(",");
            first = false;
            jsonBody.append("\"").append(entry.getKey()).append("\":");
            if (entry.getValue() instanceof Number || entry.getValue() instanceof Boolean) {
                jsonBody.append(entry.getValue());
            } else {
                jsonBody.append("\"").append(escapeJson(String.valueOf(entry.getValue()))).append("\"");
            }
        }
        jsonBody.append("}");

        HttpURLConnection conn = (HttpURLConnection) new URL(apiBase + endpoint).openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setDoInput(true);
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(15000);
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        conn.setRequestProperty("Accept", "application/json");
        conn.setRequestProperty("User-Agent", "AdarshAuth-Java/1.0");

        byte[] outputBytes = jsonBody.toString().getBytes(StandardCharsets.UTF_8);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(outputBytes);
            os.flush();
        }

        int statusCode = conn.getResponseCode();
        InputStream is = (statusCode >= 200 && statusCode < 400) ? conn.getInputStream() : conn.getErrorStream();
        if (is == null) {
            throw new Exception("HTTP " + statusCode + " - No response stream");
        }

        BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder responseSb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {
            responseSb.append(line);
        }
        br.close();

        return SimpleJson.parse(responseSb.toString());
    }

    private static String calculateHMAC(String data, String key) {
        try {
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private static String escapeJson(String raw) {
        if (raw == null) return "";
        return raw.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    /**
     * Lightweight internal JSON parser for standalone, zero-dependency Java execution.
     */
    public static class SimpleJson {
        private final Map<String, Object> data = new HashMap<>();

        public static SimpleJson parse(String jsonStr) {
            SimpleJson sj = new SimpleJson();
            if (jsonStr == null) return sj;
            String trimmed = jsonStr.trim();
            if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
                sj.data.put("message", trimmed);
                return sj;
            }

            String content = trimmed.substring(1, trimmed.length() - 1);
            boolean inQuotes = false;
            StringBuilder currentKey = new StringBuilder();
            StringBuilder currentValue = new StringBuilder();
            boolean readingKey = true;

            for (int i = 0; i < content.length(); i++) {
                char c = content.charAt(i);
                if (c == '\"' && (i == 0 || content.charAt(i - 1) != '\\')) {
                    inQuotes = !inQuotes;
                    continue;
                }
                if (!inQuotes) {
                    if (c == ':' && readingKey) {
                        readingKey = false;
                        continue;
                    }
                    if (c == ',') {
                        saveEntry(sj, currentKey.toString().trim(), currentValue.toString().trim());
                        currentKey.setLength(0);
                        currentValue.setLength(0);
                        readingKey = true;
                        continue;
                    }
                }
                if (readingKey) {
                    currentKey.append(c);
                } else {
                    currentValue.append(c);
                }
            }
            saveEntry(sj, currentKey.toString().trim(), currentValue.toString().trim());
            return sj;
        }

        private static void saveEntry(SimpleJson sj, String key, String val) {
            if (key.isEmpty()) return;
            if (val.startsWith("\"") && val.endsWith("\"") && val.length() >= 2) {
                sj.data.put(key, val.substring(1, val.length() - 1));
            } else if ("true".equalsIgnoreCase(val)) {
                sj.data.put(key, Boolean.TRUE);
            } else if ("false".equalsIgnoreCase(val)) {
                sj.data.put(key, Boolean.FALSE);
            } else {
                try {
                    sj.data.put(key, Integer.parseInt(val));
                } catch (NumberFormatException e) {
                    sj.data.put(key, val);
                }
            }
        }

        public String getString(String key, String def) {
            Object val = data.get(key);
            return val != null ? String.valueOf(val) : def;
        }

        public boolean getBoolean(String key, boolean def) {
            Object val = data.get(key);
            if (val instanceof Boolean) return (Boolean) val;
            if (val != null) return Boolean.parseBoolean(String.valueOf(val));
            return def;
        }

        public int getInt(String key, int def) {
            Object val = data.get(key);
            if (val instanceof Number) return ((Number) val).intValue();
            try {
                return Integer.parseInt(String.valueOf(val));
            } catch (Exception e) {
                return def;
            }
        }
    }
}
