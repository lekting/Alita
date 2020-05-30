import telegram_module from './module';
import telegram from '../bot';

import action_types from './actions'

interface message {
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
            let current = Math.round(new Date().getTime() / 1000);
            let actions = await this.telegram.instagram.mongoClient.findSome('deferred', { time: { $lt: current } });
            if(!actions || actions.length === 0)
                return;

            for(let action of actions) {

                this.telegram.instagram.uploadPhoto(`./photos/${action.id}/${action.image}_rend.jpg`, 'test');

                await this.telegram.instagram.mongoClient.deleteSome('deferred', { _id: action._id })
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
        return new Promise(async (resolve, reject) => {
            let usr_id = message.chat.id;

            let act = this.telegram.getAction(usr_id);
            if(act) {

                if(message.text === 'Отменить') {
                    await this.telegram.sendMessage(message.chat.id, {
                        text: 'Создание поста отменено.',
                        reply_markup: JSON.stringify({
                            remove_keyboard: true
                        })
                    });

                    this.remove(message.chat.id);
                    
                    await this.sendWelcome(message.chat.id);
                } else {
                    switch(act.action) {
                        case action_types.CREATING_POST: {
                            this.proccess_creating_post(message);
                            break;
                        }
                        case action_types.SETTING_TIME: {
                            this.proccess_setting_time(message);
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                }
            } else
                await this.sendWelcome(message.chat.id);

            resolve();
        });
    }

    proccess_creating_post(message: any): Promise<any> {
        return new Promise(async (resolve, reject) => {
            let usr_id = message.chat.id;

            let last_post_msg = this.getMessage(usr_id);
            if(message.text === 'Дальше' && last_post_msg && last_post_msg.msg !== '') {
                this.telegram.changeAction(usr_id, action_types.SETTING_TIME);
                
                let proved_date = new Date();

                await this.telegram.sendKeyboard(usr_id, `Введите время в формате: час минуты дата месяц (Пример: 03 00 11 02). \nТекущее время: ${proved_date.getUTCDate()} ${this.months[proved_date.getUTCMonth()]} ${proved_date.getUTCFullYear()}, ${('0' + proved_date.getUTCHours()).slice(-2)}:${('0' + proved_date.getUTCMinutes()).slice(-2)}`, [
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
        return new Promise(async (resolve, reject) => {
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

                hour = hour.length === 1 ? '0' + hour : hour;
                minutes = minutes.length === 1 ? '0' + minutes : minutes;
                date = date.length === 1 ? '0' + date : date;
                month = month.length === 1 ? '0' + month : month;

                if((parseInt(hour) > 24 || parseInt(hour) < 0)
                    || (parseInt(minutes) > 59 || parseInt(minutes) < 0)
                    || (parseInt(date) > 31 || parseInt(date) < 0)
                    || (parseInt(month) > 12 || parseInt(month) < 0))
                {

                    await this.telegram.sendText(usr_id, 'Дата указана неверно');
                    
                    resolve();
                    return;
                }

                let current = new Date();

                let proved_date = new Date(`${current.getFullYear()}-${month}-${date}T${hour}:${minutes}:00Z`);

                if(proved_date.getTime() < current.getTime()) {
                    await this.telegram.sendText(usr_id, 'Укажите дату, которая будет больше чем текущая на 1 минуту');
                    resolve();
                    return;
                }

                let last_post_msg = this.getMessage(usr_id);
                last_post_msg.time = proved_date.getTime() / 1000;

                //TODO: in database
                //this.temp.push(last_post_msg);
                await this.telegram.instagram.mongoClient.insertSomeOne('deferred', last_post_msg);

                this.remove(usr_id);

                await this.telegram.sendMessage(usr_id, {
                    text: `Создан отложенный пост. Будет опубликован ${proved_date.getUTCDate()} ${this.months[proved_date.getUTCMonth()]} ${proved_date.getUTCFullYear()}, ${('0' + proved_date.getUTCHours()).slice(-2)}:${('0' + proved_date.getUTCMinutes()).slice(-2)}`,
                    reply_markup: JSON.stringify({
                        remove_keyboard: true
                    })
                })

                await this.sendWelcome(usr_id);

            } catch(e) {
                await this.telegram.sendText(usr_id, 'Дата указана неверно');
            }

            resolve();
        });
    }

    actionQuery(message: any): Promise<any> {
        return new Promise(async (resolve, reject) => {
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