package com.waddle.app;

import java.io.IOException;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/** Transport for the existing private Wendler server. Does not hold model credentials. */
public final class RuntimeConnection {
    public static final String SERVER = "https://faux-poweredge-t110-ii.tail212b91.ts.net";
    private final OkHttpClient client = new OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS).readTimeout(200, TimeUnit.SECONDS)
        .callTimeout(370, TimeUnit.SECONDS).retryOnConnectionFailure(false)
        .followRedirects(false).followSslRedirects(false).build();
    public interface Listener {
        void event(JSONObject event);
        void failed(String message);
    }
    public void request(String path, JSONObject payload, boolean stream, Listener listener) {
        Request.Builder request = new Request.Builder().url(SERVER + path).header("Accept", stream ? "application/x-ndjson" : "application/json");
        if (payload != null) request.post(RequestBody.create(payload.toString(), MediaType.get("application/json; charset=utf-8")));
        client.newCall(request.build()).enqueue(new Callback() {
            public void onFailure(Call call, IOException cause) { listener.failed("Sem conexão com o servidor. Confira a internet e o Tailscale. A mensagem não será reenviada automaticamente."); }
            public void onResponse(Call call, Response response) {
                try (Response received = response) {
                    if (received.body() == null) throw new IOException("Resposta vazia");
                    if (!received.isSuccessful()) {
                        String message = "Servidor indisponível (" + received.code() + ").";
                        try { message = new JSONObject(received.body().string()).optString("error", message); } catch (Exception ignored) { }
                        listener.failed(message); return;
                    }
                    if (!stream) { listener.event(new JSONObject(received.body().string())); return; }
                    boolean done = false;
                    String line;
                    while ((line = received.body().source().readUtf8Line()) != null) {
                        if (line.trim().isEmpty()) continue;
                        JSONObject event = new JSONObject(line);
                        listener.event(event);
                        if (event.optString("type").equals("done")) done = true;
                    }
                    if (!done) listener.failed("A conexão terminou. Atualize a conversa para conferir o resultado antes de repetir.");
                } catch (Exception cause) { listener.failed("Não foi possível ler a resposta. Atualize a conversa antes de repetir a mensagem."); }
            }
        });
    }
    public void close() { client.dispatcher().cancelAll(); client.connectionPool().evictAll(); }
}
