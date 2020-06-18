import telegram_module from './module';
import telegram from '../bot';

import parse_module, { telegraph_object } from '../parse_modules/parse_module';

import zfilm from '../parse_modules/zfilm-hd';
import yummyanime from '../parse_modules/yummyanime';
import filmix from '../parse_modules/filmix';
import Baskino from '../parse_modules/baskino';
import Telegraph from 'telegra.ph';

import action_types from './actions'
import config from '../config';

export default class parse_site extends telegram_module {

    parse_modules: Array<parse_module> = [
        new zfilm(),
        new yummyanime(),
        new Baskino(),
        new filmix()
    ];

    working: boolean = false;

    teleclient: Telegraph;

    constructor(telegram: telegram) {
        super('parse_site', telegram);

        this.teleclient = new Telegraph(config.telegraph.token);

        this.addButton({
            text: 'Спарсить сайт',
            callback_data: action_types.PARSE
        });
    }
    
    action(message: any): Promise<any> {
        return new Promise(async (resolve, _) => {
            let usr_id = message.chat.id;

            let act = this.telegram.getAction(usr_id);
            if(act) {
                switch(act.action) {
                    case action_types.PARSE: {
                        if(await this.processCancel(message))
                            break;

                        if(this.working) {
                            await this.telegram.sendText(usr_id, 'Подожди, работаю');
                            break;
                        }

                        let finded = await this.telegram.instagram.mongoClient.findSomeOne('films', { url: message.text }, { url: 1 });

                        if(finded.length > 0) {
                            await this.telegram.sendText(usr_id, 'Ссылка уже была отпаршена');
                            break;
                        }
                    
                        let module = this.getWorkingModule(message.text);
                    
                        if(!module) {
                            await this.telegram.sendText(usr_id, 'Ссылка имеет неправильный вид');
                            break
                        }

                        await this.telegram.sendText(usr_id, 'Работаю...')

                        this.working = true;

                        module.makeTelegraph(message.text).then((content: telegraph_object) => {
                            if(!this.teleclient) {
                                this.telegram.sendText(usr_id, 'Telegraph не подключён');
                                this.working = false;
                                return;
                            }
                            this.teleclient.createPage(content.title, content.content, config.telegraph.channelName, config.telegraph.channelUrl, true).then(async (pages) => {
                                await this.telegram.sendText(usr_id, module.getOutText(content.data, pages));
                    
                                await this.telegram.instagram.mongoClient.insertSomeOne('films', { url: message.text, telegraph_url: pages.url });
                                await this.telegram.sendWelcome(usr_id);
                                this.working = false;
                            });
                        }).catch(async (err: any) => {
                            await this.telegram.sendText(usr_id, err);
                            console.log(err);
                        });
                        break;
                    }
                }
            }

            resolve();
        });
    }

    actionQuery(message: any): Promise<any> {
        return new Promise(async (resolve, _) => {
            
            if(message.data === action_types.PARSE) {
                this.telegram.changeAction(message.message.chat.id, action_types.PARSE);

                await this.telegram.deleteMessage(message.message.chat.id, message.message.message_id);

                await this.telegram.sendKeyboard(message.message.chat.id, 'Отправьте боту ссылку на сервис', [
                    [{
                        text: 'Отменить'
                    }],
                ]);
            }

            resolve();
        });
    }

    getWorkingModule(url: string): parse_module {
        if(typeof url !== 'string' || !(url.startsWith('https://') || url.startsWith('http://')))
            return null;
    
        let link = url.match(/\/\/(.*?)\//)[1];
        
        for(let i = 0; i < this.parse_modules.length; i++)
            if(this.parse_modules[i].getSite().includes(link))
                return this.parse_modules[i];
    
        return null;
    }
    
}