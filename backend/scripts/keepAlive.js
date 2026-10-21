require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

async function pingPostgres(databaseUrl) {
    const { Pool } = require("pg");
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    console.log("⏳ Connessione diretta a PostgreSQL/Supabase in corso...");
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT NOW() as server_time, version() as pg_version;");
        console.log("✅ Ping a Supabase (via PostgreSQL) eseguito con successo!");
        console.log("🕒 Orario server database:", res.rows[0].server_time);
        console.log("📦 Versione PostgreSQL:", res.rows[0].pg_version.split(" on ")[0]);
    } finally {
        client.release();
        await pool.end();
    }
}

async function pingRestApi(supabaseUrl, supabaseKey) {
    console.log("⏳ Richiesta REST API a Supabase in corso...");
    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/rest/v1/users?select=id&limit=1`, {
        method: "GET",
        headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
        }
    });

    if (response.ok) {
        console.log("✅ Ping a Supabase (via REST API) eseguito con successo! HTTP Status:", response.status);
    } else {
        const text = await response.text();
        console.warn(`⚠️ Risposta API non standard (HTTP ${response.status}):`, text);
    }
}

async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (databaseUrl) {
        await pingPostgres(databaseUrl);
        return;
    }

    if (supabaseUrl && supabaseKey) {
        await pingRestApi(supabaseUrl, supabaseKey);
        return;
    }

    console.error("❌ Errore: Nessuna credenziale trovata.");
    console.error("Configura 'DATABASE_URL' oppure 'SUPABASE_URL' e 'SUPABASE_ANON_KEY' nei GitHub Secrets o nel file .env.");
    process.exit(1);
}

main().catch((err) => {
    console.error("❌ Errore durante l'esecuzione del ping:", err.message);
    process.exit(1);
});