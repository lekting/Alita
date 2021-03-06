import request from 'request';
import instagram from './instagram';
import telegram_module from './telegram_modules/module';

import make_post from './telegram_modules/make_post';

import fs from 'fs';

import url from 'url';
import http from 'http';
import https from 'https';
import path from 'path';
import parse_site from './telegram_modules/parse_site';

import action_types from './telegram_modules/actions'

const mkdirp    = require('mkdirp');
const telegram  = require('telegram-bot-api');
const ffmpeg    = require('fluent-ffmpeg');

const sharp     = require('sharp');

interface action {
    id: string;
    action: string;
}

export default class bot {

    instagram: instagram;
    bot: any;

    private token: string = '';

    private modules: Array<telegram_module> = [ new make_post(this), new parse_site(this) ];
    private actions: Array<action> = [];
    private admins: Array<string> = [ '192181835' ]

    constructor(inst: instagram) {
        this.instagram = inst;
    }

    getAction(id: string): action {
        for(let i = 0; i < this.actions.length; i++) {
            let act = this.actions[i];
            if(act.id === id)
                return act;
        }

        return null;
    }

    changeAction(id: string, action: string) {
        let act = this.getAction(id);

        if(!act) {
            this.actions.push({ id: id, action: action });
            return;
        }

        act.action = action;
    }

    /* findModule(): telegram_module {
        return null;
    } */

    init(): Promise<any> {
        return new Promise((resolve, _) => {
            this.bot = new telegram ({ token: this.token, updates: { enabled: true } });

            this.bot.on('inline.callback.query', async (message: any) => {
                if(!this.admins.includes('' + message.from.id)) {

                    return;
                }

                for(let module of this.modules)
                    await module.actionQuery(message);
            });

            //TODO: message_object interface
            this.bot.on('message', async (message: any) => {
                if(!this.admins.includes('' + message.chat.id)) {

                    return;
                }

                for(let module of this.modules)
                    await module.action(message);
            });
            resolve();
        });
    }

    deleteMessage(id: string, message_id: string): Promise<any> {
        return this.bot.deleteMessage({
            chat_id: id,
            message_id: message_id,
        });
    }
    
    sendInlineKeyboard(id: string, text: string, keyboard: Array<any>): Promise<any> {
        return this.sendMessage(id, {
            text: text,
            reply_markup: JSON.stringify({
                inline_keyboard: keyboard,
            })
        });
    }

    sendVideoAndKeyboard(id: string, text: string, video: string, keyboard: Array<any>): Promise<any> {
        return this.bot.sendVideo({
            chat_id: id,
            caption: text,
            video: video,
            reply_markup: JSON.stringify({
                keyboard: keyboard,
                resize_keyboard: true
            })
        });
    }

    sendPhotoAndKeyboard(id: string, text: string, photo: string, keyboard: Array<any>): Promise<any> {
        return this.bot.sendPhoto({
            chat_id: id,
            caption: text,
            photo: photo,
            reply_markup: JSON.stringify({
                keyboard: keyboard,
                resize_keyboard: true
            })
        });
    }

    sendKeyboard(id: string, text: string, keyboard: Array<any>): Promise<any> {
        return this.sendMessage(id, {
            text: text,
            reply_markup: JSON.stringify({
                keyboard: keyboard,
                resize_keyboard: true
            })
        });
    }

    sendText(id: string, text: string): Promise<any> {
        return this.sendMessage(id, {
            text: text
        })
    }

    sendMessage(id: string, data: any): Promise<any> {
        return this.bot.sendMessage({
            chat_id: id,
            ...data
        })
    }

    getKeyBoards(): Array<any> {
        let arr = [];

        for(let module of this.modules) {
            if(module.buttons.length === 0)
                continue;

            arr.push(module.buttons);
        }

        return arr;
    }

    sendWelcome(id: string): Promise<any>{
        return new Promise(async (resolve, _) => {
            let keybaord = this.getKeyBoards();

            keybaord.unshift([{
                text: 'Отложенные', callback_data: action_types.DEFFERED,
            }]);
            keybaord.unshift([{
                text: 'Создать пост', callback_data: action_types.CREATING_POST
            }]);

            await this.sendMessage(id, {
                text: 'Здесь вы можете создавать посты, просматривать статистику и выполнять другие задачи.',
                reply_markup: JSON.stringify({
                    inline_keyboard: keybaord
                })
            });

            resolve();
        });
    }

    downloadPhoto(chat_id: string, file_id: string): Promise<any> {
        return new Promise((resolve, reject) => {
            request('https://api.telegram.org/bot' + this.token + '/getFile?file_id=' + file_id, (_, response, body) => {
                body = JSON.parse(body);

                let file_name = file_id.substring(0, 32) + path.extname(body.result.file_path.split('/')[1]);
                this.download('https://api.telegram.org/file/bot' + this.token + '/' + body.result.file_path, {
                    directory: './photos/' + chat_id,
                    filename: file_name
                }, (err: any) => {
                    if (err) {
                        resolve(err);
                        return;
                    }

                    setTimeout(() => {
                        sharp(`./photos/${chat_id}/${file_name}`)
                        .resize(1080, 1083)
                        .toFile(`./photos/${chat_id}/${file_id.substring(0, 32)}_rend.jpg`)
                        .then(() => {
                            fs.unlinkSync(`./photos/${chat_id}/${file_name}`);
                            resolve();
                        });
                    }, 1000);
                })
            });
        });
    }

    downloadVideo(chat_id: string, message: any): Promise<any> {
        return new Promise((resolve, reject) => {
            let file_id = message.video.file_id;
            request('https://api.telegram.org/bot' + this.token + '/getFile?file_id=' + file_id, async (_, response, body) => {
                body = JSON.parse(body);

                if(body.error) {
                    this.sendText(chat_id, 'Видео слишком большое (можна до 20МБ)');
                    resolve(body.description);
                    return;
                }

                await this.downloadPhoto(chat_id, message.video.thumb.file_id)

                let file_name = file_id.substring(0, 32) + path.extname(body.result.file_path.split('/')[1]);

                this.download('https://api.telegram.org/file/bot' + this.token + '/' + body.result.file_path, {
                    directory: `./videos/${chat_id}`,
                    filename: file_name
                }, async (err: any) => {
                    if (err) throw err

                    this.sendText(chat_id, 'Ожидайте, видео обрабатывается...');

                    setTimeout(() => {
                        ffmpeg(`./videos/${chat_id}/${file_name}`)
                        .output(`./videos/${chat_id}/${file_id.substring(0, 32)}_rend.mp4`)
                        .videoCodec('libx264')
                        .size('1080x1200')
                        .on('error', (err: any) => {
                            resolve(err);
                        })
                        .on('end', () => {
                            fs.unlinkSync(`./videos/${chat_id}/${file_name}`);
                            resolve();
                        })
                        .run();
                    }, 1000);

                })
            });
        });
    }

    private download(file: string, options: any, callback: (err?: any, data?: string) => void): void {
        if (!file)
            throw('Need a file url to download');

        options = options || {};

        options.timeout = options.timeout || 20000;

        options.directory = options.directory || '.';

        let uri = file.split('/');
        options.filename = options.filename || uri[uri.length - 1];

        let path = options.directory + '/' + options.filename;

        let request = (url.parse(file).protocol === 'https:' ? https : http).get(file, (response: any) => {

            if (response.statusCode === 200) {
                mkdirp(options.directory).then((_: string) => {
                    response.pipe(fs.createWriteStream(path));
                }).catch((err: any) => {
                    if (callback)
                        callback(err);
                });

            } else {
                if (callback)
                    callback(response.statusCode);
            }

            response.on('end', () => {
                if (callback)
                    callback(false, path);
            })

            request.setTimeout(options.timeout, () => {
                request.abort();
                callback('Timeout');
            })

        }).on('error', (err: any) => {
            if (callback)
                callback(err);
        })

    }

}