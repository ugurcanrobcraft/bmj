import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits } from '@jubbio/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

const activeBots = new Map();

// Jubbio Core ile Botu Çalıştırma ve BDFD / Kod Yorumlayıcı
app.post('/api/run-bot', async (req, res) => {
    const { botId, token, codes } = req.body;
    if (!token) return res.status(400).json({ error: "Token eksik!" });

    try {
        if (activeBots.has(botId)) {
            activeBots.get(botId).destroy();
            activeBots.delete(botId);
        }

        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates
            ]
        });

        client.on('ready', () => {
            console.log(`✅ [Jubbio Bot] ${client.user?.username} olarak giriş yapıldı!`);
        });

        // BDFD / Özel Komut İşleyicisi
        client.on('messageCreate', (message) => {
            if (message.author.bot) return;
            codes.forEach(script => {
                if (script.content.includes('&sendMessage')) {
                    const match = script.content.match(/&sendMessage\[(.*?)\]/);
                    if (match && message.content.startsWith("!")) {
                        message.channel.send(match[1]);
                    }
                }
            });
        });

        await client.login(token);
        activeBots.set(botId, client);

        return res.json({ success: true, message: "Bot Jubbio Core ile aktif edildi!" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Botu Durdurma (Unhost)
app.post('/api/stop-bot', (req, res) => {
    const { botId } = req.body;
    if (activeBots.has(botId)) {
        activeBots.get(botId).destroy();
        activeBots.delete(botId);
        return res.json({ success: true, message: "Bot unhost edildi (durduruldu)." });
    }
    return res.json({ success: true, message: "Bot zaten inaktif." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 BMJ Jubbio Host Sistemi ${PORT} portunda aktif!`));
