package com.adarshauth;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.json.JSONObject;

/**
 * Official AdarshAuth SDK for Java / Android Applications
 * Endpoint target: https://adarshauth.store/api/client
 */
public class AdarshAuth {
    private static final String API_BASE_DEFAULT = "https://adarshauth.store/api/client";

    private final String appName;
    private final String ownerId;
    private final String appSecret;
    private final String version;
    private final String apiBase;

    private String sessionToken;
    private UserData userData;

    public static class UserData {
        public String username;
        public String ip;
        public String hwid;
        public String createdate;
        public String lastlogin;
        public String subscription;
        public String expiryDate;
        public int activeSessions;

        public UserData(JSONObject json) {
            this.username = json.optString("username", "");
            this.ip = json.optString("ip", "");
            this.hwid = json.optString("hwid", "");
            this.createdate = json.optString("createdate", "");
            this.lastlogin = json.optString("lastlogin", "");
            this.subscription = json.optString("subscription", "default");
            this.expiryDate = json.optString("expiryDate", "Lifetime");
            this.activeSessions = json.optInt("activeSessions", 1);
        }
    }

    public AdarshAuth(String appName, String ownerId, String appSecret, String version) {
        this(appName, ownerId, appSecret, version, API_BASE_DEFAULT);
    }

    public AdarshAuth(String appName, String ownerId, String appSecret, String version, String apiBase) {
        this.appName = appName;
        this.ownerId = ownerId;
        this.appSecret = appSecret;
        this.version = version;
        this.apiBase = (apiBase != null && !apiBase.isEmpty()) ? apiBase : API_BASE_DEFAULT;
    }

    /**
     * Initializes connection with AdarshAuth server
     */
    public boolean init() throws Exception {
        Map<String, String> payload = new HashMap<>();
        JSONObject response = postRequest("/init", payload);
        return response.optBoolean("success", false);
    }

    /**
     * Authenticates a user with username and password
     */
    public UserData login(String username, String password) throws Exception {
        Map<String, String> payload = new HashMap<>();
        payload.put("username", username);
        payload.put("password", password);
        payload.put("hwid", getHWID());

        JSONObject response = postRequest("/login", payload);
        if (response.optBoolean("success", false)) {
            this.sessionToken = response.optString("sessionToken", "");
            this.userData = new UserData(response);
            return this.userData;
        } else {
            throw new Exception(response.optString("message", "Login failed"));
        }
    }

    /**
     * Registers a new user account using a license key
     */
    public UserData register(String username, String password, String licenseKey) throws Exception {
        Map<String, String> payload = new HashMap<>();
        payload.put("username", username);
        payload.put("password", password);
        payload.put("license_key", licenseKey);
        payload.put("hwid", getHWID());

        JSONObject response = postRequest("/register", payload);
        if (response.optBoolean("success", false)) {
            this.sessionToken = response.optString("sessionToken", "");
            this.userData = new UserData(response);
            return this.userData;
        } else {
            throw new Exception(response.optString("message", "Registration failed"));
        }
    }

    /**
     * Authenticates using a License Key directly
     */
    public UserData license(String licenseKey) throws Exception {
        Map<String, String> payload = new HashMap<>();
        payload.put("key", licenseKey);
        payload.put("hwid", getHWID());

        JSONObject response = postRequest("/license", payload);
        if (response.optBoolean("success", false)) {
            this.sessionToken = response.optString("sessionToken", "");
            this.userData = new UserData(response);
            return this.userData;
        } else {
            throw new Exception(response.optString("message", "License activation failed"));
        }
    }

    /**
     * Validates active session token
     */
    public boolean check() throws Exception {
        if (sessionToken == null || sessionToken.isEmpty()) return false;
        Map<String, String> payload = new HashMap<>();
        payload.put("sessionToken", sessionToken);
        payload.put("hwid", getHWID());

        JSONObject response = postRequest("/check", payload);
        return response.optBoolean("success", false);
    }

    /**
     * Fetches custom server variable
     */
    public String var(String varId) throws Exception {
        Map<String, String> payload = new HashMap<>();
        payload.put("varId", varId);
        JSONObject response = postRequest("/var", payload);
        if (response.optBoolean("success", false)) {
            return response.optString("value", "");
        }
        throw new Exception(response.optString("message", "Variable fetch failed"));
    }

    /**
     * Generates persistent hardware ID (Supports Android & Standard Java)
     */
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
            return "UNKNOWN_HWID_DEVICE";
        }
    }

    private JSONObject postRequest(String endpoint, Map<String, String> extraPayload) throws Exception {
        String fullUrl = apiBase + endpoint;
        HttpURLConnection conn = (HttpURLConnection) new URL(fullUrl).openConnection();

        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setDoInput(true);
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(15000);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Accept", "application/json");
        conn.setRequestProperty("User-Agent", "AdarshAuth-Java/1.0");

        JSONObject bodyJson = new JSONObject();
        bodyJson.put("name", appName);
        bodyJson.put("ownerid", ownerId);
        bodyJson.put("secret", appSecret);
        bodyJson.put("version", version);

        if (extraPayload != null) {
            for (Map.Entry<String, String> entry : extraPayload.entrySet()) {
                bodyJson.put(entry.getKey(), entry.getValue());
            }
        }

        byte[] outputBytes = bodyJson.toString().getBytes(StandardCharsets.UTF_8);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(outputBytes);
            os.flush();
        }

        int statusCode = conn.getResponseCode();
        InputStream is = (statusCode >= 200 && statusCode < 400) ? conn.getInputStream() : conn.getErrorStream();

        BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder responseSb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {
            responseSb.append(line);
        }
        br.close();

        String rawResponse = responseSb.toString();
        if (rawResponse == null || rawResponse.trim().isEmpty()) {
            throw new Exception("Empty response from authentication server (HTTP " + statusCode + ")");
        }

        // Response HMAC Verification
        String receivedSig = conn.getHeaderField("X-AdarshAuth-Signature");
        if (receivedSig != null && !receivedSig.isEmpty() && appSecret != null && !appSecret.isEmpty()) {
            String calculatedSig = calculateHMAC(rawResponse, appSecret);
            if (!calculatedSig.equalsIgnoreCase(receivedSig)) {
                throw new Exception("Security Alert: Server response signature verification failed!");
            }
        }

        return new JSONObject(rawResponse);
    }

    private static String calculateHMAC(String data, String key) throws Exception {
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
    }

    public UserData getUserData() {
        return userData;
    }

    public String getSessionToken() {
        return sessionToken;
    }
}
