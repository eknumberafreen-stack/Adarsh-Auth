package com.adarshcheats;

import android.content.Context;
import android.os.Build;
import android.provider.Settings;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Drop-in KeyAuth.java Replacement for AdarshAuth Server
 * Package: com.adarshcheats
 * Target Server: https://adarshauth.store/api/client
 */
public class KeyAuth {
    private static final String DEFAULT_API_BASE = "https://adarshauth.store/api/client";

    private final String appname;
    private final String ownerid;
    private final String version;
    private String apiUrl;
    private final Context context;
    private String sessionid;

    public KeyAuth(String appname, String ownerid, String version, String url, Context context) {
        this.appname = appname;
        this.ownerid = ownerid;
        this.version = version;
        this.apiUrl = normalizeApiUrl(url);
        this.context = context;
        this.sessionid = null;
    }

    private static String normalizeApiUrl(String url) {
        if (url == null || url.trim().isEmpty() || url.contains("keyauth.win") || url.contains("keyauth.cc")) {
            return DEFAULT_API_BASE;
        }
        String u = url.trim();
        if (u.endsWith("/")) {
            u = u.substring(0, u.length() - 1);
        }
        return u;
    }

    public void init() throws Exception {
        JSONObject json = new JSONObject();
        json.put("name", appname);
        json.put("ownerid", ownerid);
        json.put("version", version);

        JSONObject response = makeApiCall(apiUrl + "/init", json);
        if (!response.optBoolean("success", false)) {
            throw new Exception(response.optString("message", "Initialization failed"));
        }
        this.sessionid = response.optString("sessionToken", "active_session");
    }

    public UserData login(String username, String password) throws Exception {
        if (sessionid == null || sessionid.isEmpty()) {
            init();
        }

        JSONObject json = new JSONObject();
        json.put("name", appname);
        json.put("ownerid", ownerid);
        json.put("version", version);
        json.put("username", username);
        json.put("password", password);
        json.put("hwid", getHWID(context));

        JSONObject response = makeApiCall(apiUrl + "/login", json);
        if (!response.optBoolean("success", false)) {
            throw new Exception(response.optString("message", "Login failed"));
        }

        this.sessionid = response.optString("sessionToken", this.sessionid);
        
        // Transform response into KeyAuth format expected by UserData.java
        JSONObject info = new JSONObject();
        info.put("username", response.optString("username", username));
        
        JSONArray subs = new JSONArray();
        JSONObject sub = new JSONObject();
        sub.put("subscription", response.optString("subscription", "default"));
        sub.put("expiry", response.optString("expiryDate", "Lifetime"));
        subs.put(sub);
        
        info.put("subscriptions", subs);
        
        JSONObject formatted = new JSONObject();
        formatted.put("success", true);
        formatted.put("info", info);

        return new UserData(context, formatted);
    }

    public void license(String key) throws Exception {
        if (sessionid == null || sessionid.isEmpty()) {
            init();
        }

        JSONObject json = new JSONObject();
        json.put("name", appname);
        json.put("ownerid", ownerid);
        json.put("version", version);
        json.put("key", key);
        json.put("hwid", getHWID(context));

        JSONObject response = makeApiCall(apiUrl + "/license", json);
        if (!response.optBoolean("success", false)) {
            throw new Exception(response.optString("message", "License activation failed"));
        }
        this.sessionid = response.optString("sessionToken", this.sessionid);
    }

    public void upgrade(String username, String key) throws Exception {
        license(key);
    }

    private String getHWID(Context ctx) {
        try {
            String base = Settings.Secure.getString(ctx.getContentResolver(), Settings.Secure.ANDROID_ID);
            if (base == null || base.isEmpty()) {
                base = "UNKNOWN_DEVICE";
            }
            base += Build.BOARD + Build.BRAND + Build.DEVICE + Build.ID;
            if (base.length() < 20) {
                base += "HWIDFILLEREXTRA123";
            }
            return base;
        } catch (Exception e) {
            return "UNKNOWN_ANDROID_DEVICE";
        }
    }

    private JSONObject makeApiCall(String endpoint, JSONObject payload) throws Exception {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(endpoint).openConnection();
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            connection.setDoInput(true);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);
            connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", "AdarshAuth-Android/1.0");

            byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
            connection.setRequestProperty("Content-Length", String.valueOf(bytes.length));

            OutputStream os = connection.getOutputStream();
            os.write(bytes);
            os.flush();
            os.close();

            int responseCode = connection.getResponseCode();
            InputStream stream = responseCode >= 400 ? connection.getErrorStream() : connection.getInputStream();
            if (stream == null) {
                throw new Exception("HTTP " + responseCode + " - No response stream");
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
            StringBuilder responseSb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                responseSb.append(line);
            }
            reader.close();

            String responseText = responseSb.toString();
            if (responseText == null || responseText.trim().isEmpty()) {
                throw new Exception("Empty response from authentication server (HTTP " + responseCode + ")");
            }

            return new JSONObject(responseText);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    public String getSessionId() {
        return sessionid;
    }
}
