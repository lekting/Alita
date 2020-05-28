import telegram from '../bot';

export default class telegram_module {

    name: string;

    constructor(name: string) {
        this.name = name;
    }

    action(message: any, telegram: telegram): Promise<any> {
        return new Promise((resolve, reject) => resolve('Not implemented'));
    }

    actionQuery(message: any, telegram: telegram): Promise<any> {
        return new Promise((resolve, reject) => resolve('Not implemented'));
    }

    sendWelcome(id: string, telegram: telegram): Promise<any>{
        return new Promise(async (resolve, reject) => {
            await telegram.sendInlineKeyboard(id, 'Здесь вы можете создавать посты, просматривать статистику и выполнять другие задачи.', [
                [{
                    text: 'Создать пост', callback_data: 'create_post'
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