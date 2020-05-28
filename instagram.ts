import { AccountRepositoryLoginResponseLogged_in_user, IgApiClient } from 'instagram-private-api';
import fs from 'fs';
import mongoWorker from './mongoWorker';

const inquirer = require('inquirer');

export default class instagram {

    user: AccountRepositoryLoginResponseLogged_in_user = null;
    ig: IgApiClient = null;
    
    private login: string = '';
    private password: string = '';
    private mongoClient: mongoWorker = null;
    private expire_time: number = 86400;
    private forbidden_names: Array<string> = [ 'shop', 'anime', 'magazin' ];

    constructor(login: string, password: string, mongo: mongoWorker) {
        this.login = login;
        this.password = password;
        this.mongoClient = mongo;
        this.ig = new IgApiClient();

        this.ig.state.generateDevice(this.login);
    }

    has(arr: Array<any>, field: string, data: any): boolean {
        for(let dt of arr)
            if(dt[field] == data)
                return true;

        return false;
    }
    
    sleep(time: number): Promise<any> {
        return new Promise((resolve, reject) => setTimeout(() => resolve(), time * 1000));
    }

    random(min: number, max: number): number {
        return Math.floor(min + Math.random() * (max + 1 - min));
    }

    forbidden(username: string): boolean {
        for(let txt of this.forbidden_names)
            if(username.includes(txt))
                return true;

        return false;
    }

    follow(search_query: string = 'фильмы', count?: number): Promise<number> {
        return new Promise(async (resolve, reject) => {

            //TODO: replace to function tags().sections();
            let { body } = await this.ig.request.send({
                url: `/api/v1/tags/${encodeURI(search_query)}/sections/`,
                method: 'POST',
                qs: {
                    timesize_offset: 10800,
                    tab: 'media',
                    count: 30,
                },
            });

            let followers = await this.ig.feed.accountFollowers(body.sections[1].layout_content.medias[this.random(0, 2)].media.user.pk).items();

            let max = count || this.random(5, followers.length);

            let i = 0;
            for(let follower of followers) {
                if(i >= max)
                    break;

                if(follower.is_private || follower.is_verified || this.forbidden(follower.username))
                    continue;

                let finded = await this.mongoClient.findSomeOne('alita_followed', { pk: follower.pk }, { pk: 1 });
                
                if(finded && finded.length > 0)
                    continue;

                await this.ig.friendship.create(follower.pk);
                //console.log(colors.bold(colors.yellow(`Подписались на ${follower.username} [${i}]`)));
                await this.mongoClient.insertSomeOne('alita_followed', { pk: follower.pk, time: Math.round(new Date().getTime() / 1000) }); 
                await this.sleep(this.random(1, 3));

                i++;
            }

            resolve(i);
        });
    }

    unfollow(count?: number): Promise<number> {
        return new Promise(async (resolve, reject) => {
        
            let followers = await this.ig.feed.accountFollowers(this.user.pk).items();

            let followed = await this.mongoClient.findSome('alita_followed', { $or: [ { followed: true }, { followed: null } ] });
    
            let unsubcribe = [];
            
            if(!followed || followed.length === 0)
                return;
    
            for(let flwed of followed) {
                if(Math.round(new Date().getTime() / 1000) < (flwed.time + this.expire_time))
                    continue;
    
                if(!this.has(followers, 'pk', flwed.pk))
                    unsubcribe.push(flwed.pk);
            }
            
            let max: number = count || this.random(5, unsubcribe.length);
    
            let i: number = 0
            for(let unflw of unsubcribe) {
                if(i >= max)
                    break;
                
                await this.ig.friendship.destroy(unflw);
                await this.sleep(this.random(1, 3));
    
                await this.mongoClient.updateSomeOne('alita_followed', { pk: unflw }, { $set: { followed: false } });
                i++;
            }

            resolve(i);
        });
    }

    upperSticker = (width: number, height: number) => ({
        x: 0.5,
        y: 0.25,
        width,
        height,
        rotation: 0.0,
    });

    centeredSticker = (width: number, height: number) => ({
        x: 0.5,
        y: 0.5,
        width,
        height,
        rotation: 0.0,
    });

    lowerSticker = (width: number, height: number) => ({
        x: 0.5,
        y: 0.75,
        width,
        height,
        rotation: 0.0,
    });

    async init(): Promise<any> {
        return new Promise(async (resolve, reject) => {
            await this.ig.simulate.preLoginFlow();
            this.ig.account.login(this.login, this.password).then(async (user: AccountRepositoryLoginResponseLogged_in_user) => {
                process.nextTick(async () => await this.ig.simulate.postLoginFlow());
                this.user = user;
                resolve();
            }).catch(async (err: any) => {
                if(err)
                    throw err;

                try {
                    await this.ig.challenge.auto(true);
            
                    const { code } = await inquirer.prompt([{
                        type: 'input',
                        name: 'code',
                        message: `Enter code`,
                    }]);
                    await this.ig.challenge.sendSecurityCode(code);
                    resolve();
                } catch(ex) {
                    reject(ex);
                }
            });
        });
    }

    async uploadPhoto(pth: string, caption: string): Promise<any> {
        return await this.ig.publish.photo({
            file: await fs.readFileSync(pth),
            caption: caption,
        });
    }

    async uploadVideo(pth: string, caption: string, cover_pth: string): Promise<any> {
        return await this.ig.publish.video({
            video: await fs.readFileSync(pth),
            coverImage: await fs.readFileSync(cover_pth),
            caption: caption
        });
    }
  
    async uploadStoryWithHashtags(file: any): Promise<any> {
        return await this.ig.publish.story({
            file,
            hashtags: [{
                ...this.upperSticker(0.9, 0.5),
                is_sticker: true,
                tag_name: 'insta',
                use_custom_title: false,
            }, {
                ...this.lowerSticker(0.9, 0.5),
                is_sticker: true,
                tag_name: 'okay',
                use_custom_title: false,
            }],
        });
    }
    
    /* async uploadStoryWithMentions(file, usernames) {
        let mentions = [];
        usernames.forEach((username) => {
            mentions.push({
                ...upperSticker(0.9, 0.5),
                user_id: await this.ig.user.getIdByUsername(username),
            });
        })

        return await this.ig.publish.story({
            file,
            mentions: mentions
        });
    } */
    
    async uploadStoryWithMedia(file: any): Promise<any> {
        const { pk } = (await this.ig.feed.user(this.ig.state.cookieUserId).items())[0];
        return await this.ig.publish.story({
            file,
            media: {
                ...this.centeredSticker(0.8, 0.8),
                is_sticker: true,
                media_id: pk,
            },
        });
    }
    
    async uploadStoryWithPoll(file: any, text: string, vote1: string, vote2: string): Promise<any> {
        return await this.ig.publish.story({
            file,
            poll: {
                ...this.centeredSticker(0.9, 0.166),
                question: text,
                viewer_vote: 0,
                viewer_can_vote: true,
                is_sticker: true,
                tallies: [{
                    count: 0,
                    text: vote1,
                    font_size: 20.0,
                }, {
                    count: 0,
                    text: vote2,
                    font_size: 20.0,
                }],
            },
        });
    }
    
    async uploadStoryWithSlider(file: any, text: string): Promise<any> {
        return await this.ig.publish.story({
            file,
            slider: {
                ...this.centeredSticker(0.9, 0.248),
                question: text,
                // on windows: use [WIN] + [.]
                emoji: '❤',
                background_color: '#000000',
                text_color: '#ffffff',
                is_sticker: true,
            },
        });
    }
    
    async uploadStoryWithQuestion(file: any, text: string): Promise<any> {
        return await this.ig.publish.story({
            file,
            question: {
                ...this.centeredSticker(0.3, 0.3),
                question: text,
                question_type: 'text',
                profile_pic_url: (await this.ig.user.info(this.ig.state.cookieUserId)).profile_pic_url,
                text_color: '#ffffff',
                background_color: '#000000',
                is_sticker: true,
                viewer_can_interact: true,
            },
        });
    }
    
    async uploadStoryWithCountdown(file: any, text: string, end: any): Promise<any> {
        return await this.ig.publish.story({
            file,
            countdown: {
                ...this.centeredSticker(0.9, 0.2),
                text: text,
                text_color: '#ffffff',
                start_background_color: '#fa0daf',
                end_background_color: '#af0dfa',
                digit_card_color: '#fafafa',
                digit_color: '#ffffff',
                is_sticker: true,
                following_enabled: true,
                // time until the hour increments (as unix-time)
                end_ts: end,
            },
        });
    }
    
    /*async uploadStoryWithChat(file) {
        return await ig.publish.story({
            file,
            chat: {
                ...centeredSticker(0.9, 0.2),
                text: 'My chat',
                start_background_color: '#fa0daf',
                end_background_color: '#af0dfa',
                is_sticker: true,
                has_started_chat: false,
            },
        });
    }*/

}