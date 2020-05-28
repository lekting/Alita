import request from 'request';
import instagram from './instagram';
import telegram_module from './telegram_modules/module';

import make_post from './telegram_modules/make_post';

import fs from 'fs';

import url from 'url';
import http from 'http';
import https from 'https';

const mkdirp   = require('mkdirp');
const telegram = require('telegram-bot-api');

interface action {
    id: string;
    action: string;
}

export default class bot {

    instagram: instagram;
    bot: any;

    private token: string = '';

    private modules: Array<telegram_module> = [ new make_post() ];
    private actions: Array<action> = [];

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
        return new Promise((resolve, reject) => {
            this.bot = new telegram ({ token: this.token, updates: { enabled: true } });

            this.bot.on('inline.callback.query', async (message: any) => {
                this.modules[0].actionQuery(message, this);

            });

            //TODO: message_object interface
            this.bot.on('message', async (message: any) => {
                this.modules[0].action(message, this);
                /* if(message.text === 'Subscribe') {
                    return;
                }
    
                if(message.video) {
                    this.downloadVideo(message.video.file_id);
                } else if(message.photo) {
                    this.downloadPhoto(message.photo.file_id);
                } else {
                    this.bot.sendMessage({
                        chat_id: message.chat.id,
                        text: 'Выбери действие урод',
                        reply_markup: JSON.stringify({
                            keyboard: [
                                {
                                    text: 'Subscribe'
                                },
                            ],
                           resize_keyboard: true
                        })
                    })
                } */
                
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

    downloadPhoto(file_id: number): Promise<any> {
        return new Promise((resolve, reject) => {
            request('https://api.telegram.org/bot' + this.token + '/getFile?file_id=' + file_id, (error, response, body) => {
                body = JSON.parse(body);

                this.download('https://api.telegram.org/file/bot' + this.token + '/' + body.result.file_path, {
                    directory: './photos/',
                    filename: body.result.file_path.split('/')[1]
                }, (err: any) => {
                    if (err) throw err
                    resolve();
                })
            });
        });
    }

    downloadVideo(file_id: number): Promise<any> {
        return new Promise((resolve, reject) => {
            request('https://api.telegram.org/bot' + this.token + '/getFile?file_id=' + file_id, (error, response, body) => {
                body = JSON.parse(body);

                this.download('https://api.telegram.org/file/bot' + this.token + '/' + body.result.file_path, {
                    directory: './videos/',
                    filename: body.result.file_path.split('/')[1]
                }, async (err: any) => {
                    if (err) throw err
                    resolve();
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

                mkdirp(options.directory, (err: any) => { 
                    if (err) {
                        if (callback)
                            callback(err);

                        return;
                    }
                    response.pipe(fs.createWriteStream(path));
                })

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