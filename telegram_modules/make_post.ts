import telegram_module from './module';
import telegram from '../bot';
import fs from 'fs';

import action_types from './actions'

interface message {
    _id?: string,
    id: string;
    msg: string;
    image?: string;
    video?: string;
    time?: number;
}

export default class make_post extends telegram_module {

    name: string;
    private messages: Array<message> = [];
    private months: Array<string> = [ 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря' ];
    
    constructor(telegram: telegram) {
        super('make_post', telegram);

        setInterval(async () => {
            let current = this.getTime().unix();
            let actions: Array<message> = await this.telegram.instagram.mongoClient.findSome('deferred', { time: { $lt: current } });
            if(!actions || actions.length === 0)
                return;

            for(let action of actions) {
                await this.telegram.instagram.mongoClient.deleteSome('deferred', { _id: action._id });
                
                if(action.video) {
                    await this.telegram.instagram.uploadVideo(`./videos/${action.id}/${action.video}_rend.mp4`, `${action.msg}`, `./photos/${action.id}/${action.image}_rend.jpg`);
                    
                    fs.unlinkSync(`./videos/${action.id}/${action.video}_rend.mp4`);
                } else
                    await this.telegram.instagram.uploadPhoto(`./photos/${action.id}/${action.image}_rend.jpg`, `${action.msg}`);

                fs.unlinkSync(`./photos/${action.id}/${action.image}_rend.jpg`);
            }
        }, 5000);
    }

    getMessage(id: string): message {
        for(let msg of this.messages)
            if(msg.id === id)
                return msg;

        return null;
    }

    addMessage(id: string, msg: string): message {
        let message: message = { id: id, msg: msg };

        this.messages.push(message);

        return message;
    }

    remove(id: string): void {
        for(let i = 0; i < this.messages.length; i++) {
            let msg = this.messages[i];
            if(msg.id === id) {
                this.messages.splice(i, 1);
                break;
            }
        }
    }
    
    action(message: any): Promise<any> {
        return new Promise(async (resolve, _) => {
            let usr_id = message.chat.id;

            let act = this.telegram.getAction(usr_id);
            if(act) {
                switch(act.action) {
                    case action_types.CREATING_POST: {
                        if(await this.processCancel(message)) {
                            this.remove(message.chat.id);
                            break;
                        }

                        this.proccess_creating_post(message);
                        break;
                    }
                    case action_types.SETTING_TIME: {
                        if(await this.processCancel(message)) {
                            this.remove(message.chat.id);
                            break;
                        }

                        this.proccess_setting_time(message);
                        break;
                    }
                }
            } else 
                await this.telegram.sendWelcome(message.chat.id);

            resolve();

        });
    }

    proccess_creating_post(message: any): Promise<any> {
        return new Promise(async (resolve, _) => {
            let usr_id = message.chat.id;

            let last_post_msg = this.getMessage(usr_id);
            if(message.text === 'Дальше' && last_post_msg && last_post_msg.msg !== '') {
                this.telegram.changeAction(usr_id, action_types.SETTING_TIME);
                
                let proved_date = this.getTime();

                await this.telegram.sendKeyboard(usr_id, `Введите время в формате: час минуты дата месяц (Пример: 03 00 11 02). \nТекущее время: ${proved_date.date()} ${this.months[proved_date.month()]} ${proved_date.year()}, ${('0' + proved_date.hours()).slice(-2)}:${('0' + proved_date.minutes()).slice(-2)}`, [
                    [{
                        text: 'Отменить'
                    }],
                ]);
                resolve();
                return;
            }
            
            if(!last_post_msg)
                last_post_msg = this.addMessage(usr_id, message.text);

            if(message.photo) {
                last_post_msg.image = message.photo[0].file_id.substring(0, 32);
                last_post_msg.msg = message.caption;
                
                let err = await this.telegram.downloadPhoto(message.chat.id, message.photo[0].file_id);

                if(err) {
                    this.telegram.sendText(usr_id, 'Произошла ошибка при обработке фото: ' + err);
                    this.remove(usr_id);
                    await this.telegram.sendWelcome(usr_id);
                    resolve();
                    return;
                }

                await this.telegram.sendPhotoAndKeyboard(usr_id, last_post_msg.msg, message.photo[0].file_id, [
                    [{
                        text: 'Дальше'
                    },{
                        text: 'Отменить'
                    }],
                ]);

                resolve();
                return;

            } else if(message.video) {
                last_post_msg.image = message.video.thumb.file_id.substring(0, 32);
                last_post_msg.video = message.video.file_id.substring(0, 32);
                last_post_msg.msg = message.caption;
                
                let err = await this.telegram.downloadVideo(message.chat.id, message);

                if(err) {
                    this.telegram.sendText(usr_id, 'Произошла ошибка при обработке видео: ' + err);
                    this.remove(usr_id);
                    await this.telegram.sendWelcome(usr_id);
                    resolve();
                    return;
                }

                await this.telegram.sendVideoAndKeyboard(usr_id, last_post_msg.msg, message.video.file_id, [
                    [{
                        text: 'Дальше'
                    },{
                        text: 'Отменить'
                    }],
                ]);

                resolve();
                return;
            } else
                last_post_msg.msg = message.text;

            await this.telegram.sendKeyboard(usr_id, last_post_msg.msg, [
                [{
                    text: 'Дальше'
                },{
                    text: 'Отменить'
                }],
            ]);
            resolve();
        });
    }

    proccess_setting_time(message: any): Promise<any> {
        return new Promise(async (resolve, _) => {
            let splitted: Array<string> = message.text.split(' ');
            if(splitted.length < 4) {
                await this.telegram.sendText(message.chat.id, 'Дата указана неверно');
                resolve();
                return;
            }

            let usr_id = message.chat.id;
            try {
                let hour = splitted[0];
                let minutes = splitted[1];
                let date = splitted[2];
                let month = splitted[3];

                hour = ('0' + hour).slice(-2);
                minutes = ('0' + minutes).slice(-2);
                date = ('0' + date).slice(-2);
                month = ('0' + month).slice(-2);

                if((parseInt(hour) > 24 || parseInt(hour) < 0)
                    || (parseInt(minutes) > 59 || parseInt(minutes) < 0)
                    || (parseInt(date) > 31 || parseInt(date) < 0)
                    || (parseInt(month) > 12 || parseInt(month) < 0)
                ){

                    await this.telegram.sendText(usr_id, 'Дата указана неверно');
                    
                    resolve();
                    return;
                }

                let current = this.getTime();

                let proved_date = this.getTime();

                //new Date(`${current.getFullYear()}-${month}-${date}T${hour}:${minutes}:00Z`)

                proved_date.date(parseInt(date));
                proved_date.month(parseInt(month) - 1);
                proved_date.hours(parseInt(hour));
                proved_date.minutes(parseInt(minutes));

                if(proved_date.unix() < current.unix()) {
                    await this.telegram.sendText(usr_id, 'Укажите дату, которая будет больше, чем текущая на 1 минуту');
                    resolve();
                    return;
                }

                let last_post_msg = this.getMessage(usr_id);
                last_post_msg.time = proved_date.unix();

                await this.telegram.instagram.mongoClient.insertSomeOne('deferred', last_post_msg);

                this.remove(usr_id);

                await this.telegram.sendMessage(usr_id, {
                    text: `Создан отложенный пост. Будет опубликован ${proved_date.date()} ${this.months[proved_date.month()]} ${proved_date.year()}, ${('0' + proved_date.hours()).slice(-2)}:${('0' + proved_date.minutes()).slice(-2)}`,
                    reply_markup: JSON.stringify({
                        remove_keyboard: true
                    })
                })

                await this.telegram.sendWelcome(usr_id);

            } catch(e) {
                await this.telegram.sendText(usr_id, 'Дата указана неверно');
            }

            resolve();
        });
    }

    actionQuery(message: any): Promise<any> {
        return new Promise(async (resolve, _) => {
            if(message.data === action_types.CREATING_POST) {
                this.telegram.changeAction(message.message.chat.id, action_types.CREATING_POST);

                await this.telegram.deleteMessage(message.message.chat.id, message.message.message_id);

                await this.telegram.sendKeyboard(message.message.chat.id, 'Отправьте боту то, что хотите опубликовать.', [
                    [{
                        text: 'Отменить'
                    }],
                ]);
            }

            resolve();
        });
    }
    
}