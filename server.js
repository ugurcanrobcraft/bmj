import express from "express";
import { Client, GatewayIntentBits } from "@jubbio/core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// JSON API
app.use(express.json({ limit: "512kb" }));

// index.html'yi yayınla
app.use(express.static(__dirname));

/*
========================================
 BOT HOSTLARI
========================================
*/

const hosts = new Map();

const HOST_TIME = 90 * 60 * 1000;

/*
========================================
 YARDIMCI FONKSİYONLAR
========================================
*/

function cleanId(value) {
    return String(value || "")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 100);
}

function getBot(botId) {
    return hosts.get(cleanId(botId));
}

/*
========================================
 BMJ DEĞİŞKENLERİ
========================================
*/

function replaceVariables(text, message) {
    const author = message.author || {};
    const channel = message.channel || {};

    let result = String(text);

    result = result.replace(
        /\$username/gi,
        author.username || author.name || "Kullanıcı"
    );

    result = result.replace(
        /\$nickname/gi,
        author.displayName ||
        author.username ||
        author.name ||
        "Kullanıcı"
    );

    result = result.replace(
        /\$channelID/gi,
        channel.id || ""
    );

    result = result.replace(
        /\$channelName/gi,
        channel.name || ""
    );

    result = result.replace(
        /\$noMentionMessage/gi,
        String(message.content || "")
            .replace(/<@!?\d+>/g, "")
            .replace(/<@&\d+>/g, "")
            .replace(/<#\d+>/g, "")
            .trim()
    );

    return result;
}

/*
========================================
 BMJ MATEMATİK
========================================
*/

function calculate(name, values) {

    const numbers = values.map(Number);

    if (
        numbers.length === 0 ||
        numbers.some(number => !Number.isFinite(number))
    ) {
        return "";
    }

    switch (name) {

        case "sum":
            return numbers.reduce(
                (total, number) => total + number,
                0
            );

        case "sub":
            if (numbers.length < 2) return "";
            return numbers[0] - numbers[1];

        case "multi":
            if (numbers.length < 2) return "";
            return numbers[0] * numbers[1];

        case "divide":
            if (numbers.length < 2) return "";
            if (numbers[1] === 0) return "";
            return numbers[0] / numbers[1];

        default:
            return "";
    }
}

/*
========================================
 BMJ KOD İŞLEYİCİ
========================================
*/

function executeBMJ(code, message) {

    let source = replaceVariables(code, message);

    const embed = {};
    let hasEmbed = false;

    /*
    $sum[1;2]
    $sub[5;2]
    $multi[5;2]
    $divide[10;2]
    */

    source = source.replace(
        /\$(sum|sub|multi|divide)\[([^\]]*)\]/gi,
        function (_, command, values) {

            const args = values
                .split(";")
                .map(x => x.trim());

            return calculate(
                command.toLowerCase(),
                args
            );
        }
    );

    /*
    $description[...]
    */

    source = source.replace(
        /\$description\[([^\]]*)\]/gi,
        function (_, value) {

            embed.description =
                replaceVariables(value, message);

            hasEmbed = true;

            return "";
        }
    );

    /*
    $title[...]
    */

    source = source.replace(
        /\$title\[([^\]]*)\]/gi,
        function (_, value) {

            embed.title =
                replaceVariables(value, message);

            hasEmbed = true;

            return "";
        }
    );

    /*
    $footer[...]
    */

    source = source.replace(
        /\$footer\[([^\]]*)\]/gi,
        function (_, value) {

            embed.footer = {
                text: replaceVariables(
                    value,
                    message
                )
            };

            hasEmbed = true;

            return "";
        }
    );

    /*
    $author[...]
    */

    source = source.replace(
        /\$author\[([^\]]*)\]/gi,
        function (_, value) {

            embed.author = {
                name: replaceVariables(
                    value,
                    message
                )
            };

            hasEmbed = true;

            return "";
        }
    );

    /*
    $image[URL]
    */

    source = source.replace(
        /\$image\[([^\]]*)\]/gi,
        function (_, value) {

            embed.image = {
                url: replaceVariables(
                    value,
                    message
                )
            };

            hasEmbed = true;

            return "";
        }
    );

    source = source.trim();

    /*
    Embed varsa
    */

    if (hasEmbed) {

        if (source) {

            embed.description =
                embed.description
                    ? embed.description + "\n" + source
                    : source;
        }

        return {
            embeds: [embed]
        };
    }

    /*
    Normal mesaj
    */

    return {
        content: source || " "
    };
}

/*
========================================
 KOMUT SİSTEMİ
========================================
*/

function registerCommands(client, commands) {

    if (!Array.isArray(commands)) {
        return;
    }

    client.on("messageCreate", async message => {

        try {

            // Botların mesajlarını görmezden gel
            if (message.author?.bot) {
                return;
            }

            const content =
                String(message.content || "");

            /*
            Komut bul
            */

            const command =
                commands.find(cmd => {

                    if (!cmd) return false;

                    const trigger =
                        String(cmd.trigger || "")
                            .trim();

                    if (!trigger) return false;

                    return content
                        .toLowerCase()
                        .startsWith(
                            trigger.toLowerCase()
                        );
                });

            if (!command) {
                return;
            }

            /*
            BMJ kodunu çalıştır
            */

            const response =
                executeBMJ(
                    String(command.code || ""),
                    message
                );

            await message.reply(response);

        } catch (error) {

            console.error(
                "BMJ komut hatası:",
                error
            );

            try {

                await message.reply(
                    "❌ Komut çalıştırılırken bir hata oluştu."
                );

            } catch {}
        }
    });
}

/*
========================================
 BOT DURDUR
========================================
*/

async function stopBot(botId) {

    const id = cleanId(botId);

    const host = hosts.get(id);

    if (!host) {
        return false;
    }

    clearTimeout(host.timer);

    try {

        if (
            host.client &&
            typeof host.client.destroy === "function"
        ) {

            await host.client.destroy();

        } else if (
            host.client &&
            typeof host.client.logout === "function"
        ) {

            await host.client.logout();
        }

    } catch (error) {

        console.error(
            "Bot kapatma hatası:",
            error
        );
    }

    hosts.delete(id);

    console.log(
        `Bot durduruldu: ${id}`
    );

    return true;
}

/*
========================================
 ANA SAYFA
========================================
*/

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );
});

/*
========================================
 HOST DURUMU
========================================
*/

app.get(
    "/api/bots/status/:id",
    (req, res) => {

        const id =
            cleanId(req.params.id);

        const host =
            hosts.get(id);

        if (!host) {

            return res.json({
                online: false,
                ready: false,
                remaining: 0
            });
        }

        const remaining =
            Math.max(
                0,
                host.expiresAt - Date.now()
            );

        res.json({

            online: remaining > 0,

            ready: host.ready,

            remaining: remaining

        });
    }
);

/*
========================================
 TÜM HOSTLAR
========================================
*/

app.get(
    "/api/bots",
    (req, res) => {

        const result = [];

        for (
            const [id, host]
            of hosts
        ) {

            result.push({

                botId: id,

                online:
                    host.expiresAt >
                    Date.now(),

                ready:
                    host.ready,

                remaining:
                    Math.max(
                        0,
                        host.expiresAt -
                        Date.now()
                    )
            });
        }

        res.json(result);
    }
);

/*
========================================
 BOT BAŞLAT
========================================
*/

app.post(
    "/api/bots/start",
    async (req, res) => {

        const botId =
            cleanId(req.body.botId);

        const token =
            String(
                req.body.token || ""
            ).trim();

        const commands =
            Array.isArray(
                req.body.commands
            )
                ? req.body.commands.slice(
                    0,
                    500
                )
                : [];

        /*
        Kontroller
        */

        if (!botId) {

            return res.status(400).json({
                error:
                    "Bot ID gerekli."
            });
        }

        if (!token) {

            return res.status(400).json({
                error:
                    "Bot tokeni gerekli."
            });
        }

        /*
        Aynı bot çalışıyorsa
        önce kapat
        */

        await stopBot(botId);

        /*
        Jubbio Client
        */

        let client;

        try {

            client =
                new Client({

                    intents: [

                        GatewayIntentBits.Guilds,

                        GatewayIntentBits.GuildMessages,

                        GatewayIntentBits.MessageContent

                    ]

                });

        } catch (error) {

            console.error(
                "Client oluşturma hatası:",
                error
            );

            return res.status(500).json({

                error:
                    "Jubbio Client oluşturulamadı."

            });
        }

        /*
        Host süresi
        */

        const expiresAt =
            Date.now() + HOST_TIME;

        /*
        Host kaydı
        */

        const host = {

            client,

            expiresAt,

            ready: false,

            timer: null

        };

        hosts.set(
            botId,
            host
        );

        /*
        Bot hazır olduğunda
        */

        client.on(
            "ready",
            () => {

                host.ready = true;

                console.log(
                    `🤖 Bot online: ${
                        client.user?.username ||
                        botId
                    }`
                );
            }
        );

        /*
        Hata
        */

        client.on(
            "error",
            error => {

                console.error(
                    `Jubbio bot hatası [${botId}]:`,
                    error
                );
            }
        );

        /*
        BMJ komutlarını bağla
        */

        registerCommands(
            client,
            commands
        );

        /*
        90 dakika sonra
        otomatik kapat
        */

        host.timer =
            setTimeout(
                () => {

                    stopBot(botId);

                },
                HOST_TIME
            );

        /*
        Jubbio Login
        */

        try {

            await client.login(token);

            console.log(
                `Host başlatıldı: ${botId}`
            );

            return res.json({

                ok: true,

                botId,

                expiresAt

            });

        } catch (error) {

            console.error(
                "Jubbio login hatası:",
                error
            );

            await stopBot(botId);

            return res.status(400).json({

                error:
                    error?.message ||
                    "Bot giriş yapamadı."

            });
        }
    }
);

/*
========================================
 BOT DURDUR
========================================
*/

app.post(
    "/api/bots/stop",
    async (req, res) => {

        const botId =
            cleanId(req.body.botId);

        if (!botId) {

            return res.status(400).json({

                error:
                    "Bot ID gerekli."

            });
        }

        const stopped =
            await stopBot(botId);

        res.json({

            ok: stopped

        });
    }
);

/*
========================================
 HEALTH CHECK
========================================
*/

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            ok: true,

            service:
                "Bot Maker Jubio Host",

            activeHosts:
                hosts.size,

            uptime:
                process.uptime()

        });
    }
);

/*
========================================
 HATA YAKALAMA
========================================
*/

process.on(
    "uncaughtException",
    error => {

        console.error(
            "Beklenmeyen hata:",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "Yakalanmamış Promise hatası:",
            error
        );
    }
);

/*
========================================
 SUNUCU
========================================
*/

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "================================="
        );

        console.log(
            "🤖 BOT MAKER JUBIO HOST"
        );

        console.log(
            "================================="
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            "🟢 Host sistemi hazır"
        );

        console.log(
            "================================="
        );

        console.log("");
    }
);
