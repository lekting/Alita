import telegram from '../bot';
import action_types from './actions'

import Moment from 'moment-timezone';

export default class telegram_module {

    name: string;
    telegram: telegram;

    buttons: Array<any> = [];

    constructor(name: string, telegram: telegram) {
        this.name = name;
        this.telegram = telegram;
    }

    addButton(keyboard: any): void {
        this.buttons.push(keyboard);
    }

    processCancel(message: any): Promise<boolean> {
        return new Promise(async (resolve, _) => {
            if(message.text === 'Отменить') {
                this.telegram.changeAction(message.chat.id, action_types.DEFAULT)
                await this.telegram.sendMessage(message.chat.id, {
                    text: 'Действие отменено.',
                    reply_markup: JSON.stringify({
                        remove_keyboard: true
                    })
                });

                
                await this.telegram.sendWelcome(message.chat.id);

                resolve(true);

                return;
            }

            resolve(false);
        });
    }

    protected getTime(): Moment.Moment {
        return Moment().tz('Europe/Kiev');
    }

    action(_: any): Promise<any> {
        return new Promise((resolve, _) => resolve(false));
    }

    actionQuery(_: any): Promise<any> {
        return new Promise((resolve, _) => resolve(false));
    }
}