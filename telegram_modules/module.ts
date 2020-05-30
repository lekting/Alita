import telegram from '../bot';
import action_types from './actions'

export default class telegram_module {

    name: string;
    telegram: telegram;

    constructor(name: string, telegram: telegram) {
        this.name = name;
        this.telegram = telegram;
    }

    action(message: any): Promise<any> {
        return new Promise((resolve, reject) => resolve('Not implemented'));
    }

    actionQuery(message: any): Promise<any> {
        return new Promise((resolve, reject) => resolve('Not implemented'));
    }

    sendWelcome(id: string): Promise<any>{
        return new Promise(async (resolve, reject) => {
            await this.telegram.sendInlineKeyboard(id, 'Здесь вы можете создавать посты, просматривать статистику и выполнять другие задачи.', [
                [{
                    text: 'Создать пост', callback_data: action_types.CREATING_POST
                }],
                [{
                    text: 'Отложенные', callback_data: 'later',
                },{
                    text: 'Редактировать', callback_data: 'edit'
                }]
            ]);

            resolve();
        });
    }
}