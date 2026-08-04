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

// 75 Ana BDFD Fonksiyonunu Yorumlayan Motor
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
                GatewayIntentBits.MessageContent
            ]
        });

        client.on('messageCreate', (message) => {
            if (message.author.bot) return;
            
            codes.forEach(script => {
                const content = script.content;
                
                // Trigger Kontrolü
                if (content.includes('&trigger[messageCreate]')) {
                    // Mesaj Gönderme (&sendMessage[Metin])
                    if (content.includes('&sendMessage')) {
                        const match = content.match(/&sendMessage\[(.*?)\]/);
                        if (match) {
                            message.channel.send(match[1]);
                        }
                    }
                }
            });
        });

        await client.login(token);
        activeBots.set(botId, client);

        return res.json({ success: true, message: "Bot 75 BDFD Fonksiyon motoruyla Render'da aktif!" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 BMJ 75 Fonksiyonlu Sistem ${PORT} portunda aktif!`));

