import telegram_module from './module';
import telegram from '../bot';

interface message {
    id: string;
    msg: string;
}

export default class make_post extends telegram_module {

    name: string;
    private messages: Array<message> = [];
    
    constructor() {
        super('make_post');
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
    
    action(message: any, telegram: telegram): Promise<any> {
        return new Promise(async (resolve, reject) => {
            let usr_id = message.chat.id;

            let act = telegram.getAction(usr_id);
            if(act) {

                if(message.text === 'Отменить') {
                    await telegram.sendMessage(message.chat.id, {
                        text: 'Создание поста отменено.',
                        reply_markup: JSON.stringify({
                            remove_keyboard: true
                        })
                    })

                    this.remove(message.chat.id);
                    
                    await this.sendWelcome(message.chat.id, telegram);
                } else {
                    switch(act.action) {
                        case 'create_post': {
                            if(message.text === 'Дальше') {
                                telegram.changeAction(message.chat.id, 'setting_time');

                                await telegram.sendKeyboard(message.chat.id, 'Введите время в формате: час минуты дата месяц (Пример: 03 00 11 02)', [
                                    [{
                                        text: 'Отменить'
                                    }],
                                ]);
                                break;
                            }

                            let last_post_msg = this.getMessage(usr_id);
                            
                            if(!last_post_msg)
                                last_post_msg = this.addMessage(usr_id, message.text);
                            else
                                last_post_msg.msg = message.text;
            
                            await telegram.sendKeyboard(message.chat.id, last_post_msg.msg, [
                                [{
                                    text: 'Дальше'
                                },{
                                    text: 'Отменить'
                                }],
                            ]);
                            break;
                        }
                        case 'setting_time': {
                            let splitted: Array<string> = message.text.split(' ');
                            if(splitted.length < 4) {
                                await telegram.sendText(message.chat.id, 'Дата указана неверно');
                                return;
                            }

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
                                    || (parseInt(month) > 12 || parseInt(month) < 0)) {
                                        await telegram.sendText(message.chat.id, 'Дата указана неверно');
                                    return;
                                }

                                let current = new Date();

                                let proved_date = new Date(`${current.getFullYear()}-${month}-${date}T${hour}:${minutes}:00Z`);

                                if(proved_date.getTime() < current.getTime()) {
                                    await telegram.sendText(message.chat.id, 'Укажите дату, которая будет больше чем текущая на 1 минуту');
                                    return;
                                }

                                await telegram.sendText(message.chat.id, 'Дата1: ' + proved_date.toUTCString());
                                await telegram.sendText(message.chat.id, 'Дата2: ' + current.toUTCString());
                            } catch(e) {
                                await telegram.sendText(message.chat.id, 'Дата указана неверно');
                            }
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                }
            } else
                await this.sendWelcome(message.chat.id, telegram);

            resolve();
        });
    }

    actionQuery(message: any, telegram: telegram): Promise<any> {
        return new Promise(async (resolve, reject) => {
            if(message.data === 'create_post') {
                telegram.changeAction(message.message.chat.id, 'create_post');

                await telegram.deleteMessage(message.message.chat.id, message.message.message_id);

                await telegram.sendKeyboard(message.message.chat.id, 'Отправьте боту то, что хотите опубликовать.', [
                    [{
                        text: 'Отменить'
                    }],
                ]);
            }

            resolve();
        });
    }
    
}