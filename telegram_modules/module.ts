import telegram from '../bot';
import action_types from './actions'

import Moment from 'moment-timezone';

export default class telegram_module {

    name: string;
    telegram: telegram;

    constructor(name: string, telegram: telegram) {
        this.name = name;
        this.telegram = telegram;
    }

    protected getTime(): Moment.Moment {
        return Moment().tz('Europe/Kiev');
    }

    action(_: any): Promise<any> {
        return new Promise((resolve, _) => resolve('Not implemented'));
    }

    actionQuery(_: any): Promise<any> {
        return new Promise((resolve, _) => resolve('Not implemented'));
    }

    sendWelcome(id: string): Promise<any>{
        return new Promise(async (resolve, _) => {
            await this.telegram.sendInlineKeyboard(id, 'Здесь вы можете создавать посты, просматривать статистику и выполнять другие задачи.', [
                [{
                    text: 'Создать пост', callback_data: action_types.CREATING_POST
                }],
                [{
                    text: 'Отложенные', callback_data: action_types.DEFFERED,
                }]
            ]);

            resolve();
        });
    }
}