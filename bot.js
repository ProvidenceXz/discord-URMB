const fs = require("fs");
const request = require("request");

const corenlp = require("corenlp");
const coreNLP = corenlp.default;
const connector = new corenlp.ConnectorServer({ dsn: 'http://localhost:9000' });
const props = new corenlp.Properties({ annotators: 'tokenize,ssplit,pos,parse' });
const pipeline = new corenlp.Pipeline(props, 'Chinese', connector);

const Discord = require('discord.js');
const auth = require('./auth.json');

let bot = {
    on: false,
    ready: false,
    voice: false,
    cao: ["\u8349", "\u8279", "\u66f9", "\u65e5", "\u64cd"],
    cmd: {
        help: "!urmb-help",
        on: "!urmb-on",
        off: "!urmb-off",
        voice_on: "!urmb-voice-on",
        voice_off: "!urmb-voice-off",
        debug: "!urmb-debug"
    }
};

const client = new Discord.Client();

client.on("ready", () => {
    bot.on = true;
    bot.ready = true;
    bot.voice = false;
    console.log("URMB ready.");
});

client.on("message", (message) => {
    if (!message.author.bot) {
        if (bot.on) {
            if (message.content.toString() == bot.cmd.help) {
                message.channel.send("欢迎使用你妈bot");
            } else if (message.content.toString() == bot.cmd.off) {
                bot.on = false;
                message.channel.send("你妈bot暂停");
            } else if (message.content.toString() == bot.cmd.debug) {
                console.log("bot.on: ", bot.on);
                console.log("bot.ready: ", bot.ready);
                console.log("bot.voice: ", bot.voice);
            } else if (message.content.toString() == bot.cmd.voice_on) {
                bot.voice = true;
                message.channel.send("你妈bot张嘴");
            } else if (message.content.toString() == bot.cmd.voice_off) {
                bot.voice = false;
                message.channel.send("你妈bot闭嘴");
            } else if (message.content.charAt(1) == "@") {
                if (bot.voice) {
                    let voice_channel = message.member.voiceChannel;
                    const args = saonima("你艾特你妈呢呢");
                    request(args).pipe(fs.createWriteStream("speech.mp3").on('finish', function() {
                        voice_channel.join()
                            .then(connection => {
                                const dispatcher = connection.playFile("speech.mp3");
                                dispatcher.on("end", end => {
                                    voice_channel.leave();
                                });
                            })
                            .catch(err => {
                                message.channel.send("不给权限你说你妈呢");
                                console.log('err', err);
                            });
                    }));
                } else {
                    message.channel.send("你艾特你妈呢");
                }
            } else if (bot.ready && message.content.toString().match(/[\u3400-\u9FBF]/)) {
                bot.ready = false;
                const sent = new coreNLP.simple.Sentence(message.content);
                pipeline.annotate(sent)
                    .then(sent => {
                        console.log('parse', sent.parse(), '\n');
                        let dump = coreNLP.util.Tree.fromSentence(sent).dump()
                        let queue = [JSON.parse(dump)];
                        while (queue.length > 0) {
                            let obj = queue.shift();
                            let v = find_verb(obj);
                            if (v) {
                                if (bot.voice) {
                                    let voice_channel = message.member.voiceChannel;
                                    if (!voice_channel) {
                                        message.channel.send("不在频道里你说你妈呢");
                                    } else {
                                        if (bot.cao.includes(v)) {
                                            if (v != "\u65e5") {
                                                v = "\u64cd";
                                            }
                                        }
                                        const args = saonima("你" + v + "你妈呢呢");
                                        //console.log(args);
                                        request(args).pipe(fs.createWriteStream("speech.mp3").on('finish', function() {
                                            voice_channel.join()
                                                .then(connection => {
                                                    const dispatcher = connection.playFile("speech.mp3");
                                                    dispatcher.on("end", end => {
                                                        voice_channel.leave();
                                                    });
                                                })
                                                .catch(err => {
                                                    message.channel.send("不给权限你说你妈呢");
                                                    console.log('err', err);
                                                });
                                        }));
                                    } 
                                } else {
                                    message.channel.send("你" + v + "你妈呢");
                                }
                                break;
                            }
                        
                            if (obj.children.length == 0) {
                                continue;
                            }
                        
                            for (var i in obj.children) {
                                queue.push(obj.children[i]);
                            }
                        }
                        bot.ready = true;
                    })
                    .catch(err => {
                        bot.ready = true;
                        console.log('err', err);
                    });
            }
        } else {
            if (message.content.toString() == bot.cmd.on) {
                bot.on = true;
                message.channel.send("你妈bot启动");
            }
        }
    }
});

let find_verb = function(data) {
    if (bot.cao.includes(data.word.charAt(0))) {
        return data.word.charAt(0);
    }
    if (data.pos == "VV") {
        return data.word;
    }
    return "";
}

let saonima = function(text) {
    const args = {
        url: `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&client=tw-ob`,
        headers: {
            'Referer': 'http://translate.google.com/',
            'User-Agent': 'stagefright/1.2 (Linux;Android 5.0)'
        }
    }
    return args;
}

client.login(auth.token);

// curl 'https://translate.google.com/translate_tts?ie=UTF-8&q=%E4%BD%A0%E8%AF%B4%E4%BD%A0%E5%A6%88%E5%91%A2&tl=zh-CN&client=tw-ob' -H 'Referer: http://translate.google.com/' -H 'User-Agent: stagefright/1.2 (Linux;Android 5.0)' > google_tts.mp3
